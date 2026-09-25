import {
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
  OnModuleDestroy,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker } from 'bullmq';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../../../database/database.service';
import { PrismaService } from '../../../database/prisma.service';
import { RequestContextService } from '../../../common/request-context/request-context.service';
import type { RequestContextSeed } from '../../../common/request-context/request-context.types';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import { ModuleAccessService } from '../../module-access/module-access.service';
import { SchoolOperationalEventsService } from '../../events/school-operational-events.service';
import {
  REPORT_INFRASTRUCTURE_SCHEMA,
  REPORT_SOURCE_TRIGGERS,
} from './report-infrastructure-schema';
import {
  reportIdentity,
  REPORT_RENDERER_VERSION,
} from './report-artifact-identity';

export const REPORT_WORK_QUEUE = 'report-cards-v2';
export const REPORT_WORK_BULK_QUEUE = 'report-cards-bulk-v2';
export type ReportWorkKind =
  | 'generate'
  | 'generate_batch'
  | 'generate_scope'
  | 'generate_regeneration_scope'
  | 'pdf'
  | 'export';
export interface ReportWorkRow {
  id: string;
  tenant_id: string;
  actor_user_id: string;
  kind: ReportWorkKind;
  identity: string;
  input: Record<string, any>;
  context: RequestContextSeed;
  result: Record<string, any> | null;
  state: string;
  progress: Record<string, any>;
  attempts: number;
  dispatch_version: number;
  lease_token: string;
  expires_at: string;
  error_code?: string;
}
export type ReportWorkHandler = (
  row: ReportWorkRow,
  progress: (value: Record<string, any>) => Promise<void>,
) => Promise<Record<string, any>>;

/** PostgreSQL is the durable job/outbox authority; Redis contains only delivery IDs.
 * No Redis calls or rendering on request threads. Only the report worker dispatches.
 */
@Injectable()
export class ReportWorkService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(ReportWorkService.name);
  private readonly handlers = new Map<ReportWorkKind, ReportWorkHandler>();
  private workers: Worker[] = [];
  private readonly producers = new Map<string, Queue>();
  private timer?: NodeJS.Timeout;
  private dispatching = false;
  private lane: string = 'all';
  constructor(
    private readonly db: DatabaseService,
    private readonly prisma: PrismaService,
    private readonly context: RequestContextService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
    private readonly modules: ModuleAccessService,
    @Optional() private readonly events?: SchoolOperationalEventsService,
  ) {}

  private async recordOutcome(
    row: ReportWorkRow,
    state: string,
    token: string,
  ) {
    await this.events?.recordSchoolOperation(
      {
        event: {
          id: `report-work:${row.id}:${token}:${state}`,
          type:
            state === 'completed'
              ? 'document.generated'
              : 'report_generation.failed',
          module: 'exams',
          entityId: row.id,
          title:
            state === 'completed'
              ? 'Report PDF ready'
              : 'Report task needs attention',
          body:
            state === 'completed'
              ? 'The saved report PDF is ready for private delivery.'
              : 'Saved academic records are safe. Review the report task and retry when the issue is resolved.',
          severity: state === 'completed' ? 'info' : 'warning',
          payload: {
            job_id: row.id,
            kind: row.kind,
            state,
            attempt: row.attempts,
          },
        },
      },
      {
        $queryRawUnsafe: async (sql: string, ...args: unknown[]) =>
          (await this.db.query(sql, args)).rows,
      } as never,
    );
  }

  register(kind: ReportWorkKind, handler: ReportWorkHandler) {
    this.handlers.set(kind, handler);
  }
  isWorker() {
    return this.config.get('app.runtime') === 'reports-worker';
  }

  async onApplicationBootstrap() {
    await this.prisma.runSchemaBootstrap(REPORT_INFRASTRUCTURE_SCHEMA);
    await this.prisma.runSchemaBootstrap(REPORT_SOURCE_TRIGGERS);
    if (!this.isWorker()) return;
    const lane = (this.lane =
      this.config.get<string>('reportCards.workerLane') ?? 'all');
    const role = await this.prisma.$queryRawUnsafe<Array<{ allowed: boolean }>>(
      'SELECT rolsuper OR rolbypassrls AS allowed FROM pg_roles WHERE rolname=current_user',
    );
    if (!role[0]?.allowed)
      throw new Error(
        'Report dispatcher requires the operational database login; request work remains scoped through the NOBYPASSRLS runtime role',
      );
    const queues =
      lane === 'interactive'
        ? [REPORT_WORK_QUEUE]
        : lane === 'bulk'
          ? [REPORT_WORK_BULK_QUEUE]
          : [REPORT_WORK_QUEUE, REPORT_WORK_BULK_QUEUE];
    this.workers = queues.map(
      (name) =>
        new Worker(name, (job) => this.execute(job.data), {
          connection: {
            ...this.redis.getBullConnectionOptions(),
            maxRetriesPerRequest: null,
            retryStrategy: (attempt) => Math.min(5000, 250 * attempt),
          },
          prefix: this.config.get<string>('queue.prefix') ?? 'my-shule',
          concurrency: Number(
            this.config.get('reportCards.workerConcurrency') ?? 1,
          ),
          lockDuration: 60_000,
          maxStalledCount: 2,
        }),
    );
    for (const worker of this.workers)
      worker.on('error', (error) =>
        this.logger.error('Report worker connection failed', error.stack),
      );
    this.timer = setInterval(() => {
      void this.dispatch();
    }, 1000);
    this.timer.unref();
    await this.dispatch();
  }
  async onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    await Promise.all([
      ...this.workers.map((worker) => worker.close()),
      ...Array.from(this.producers.values(), (queue) => queue.close()),
    ]);
  }

  private producer(name: string) {
    if (!this.producers.has(name)) {
      const queue = new Queue(name, {
        connection: {
          ...this.redis.getBullConnectionOptions(),
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
          lazyConnect: false,
          retryStrategy: (attempt) => Math.min(5000, 250 * attempt),
        },
        prefix: this.config.get<string>('queue.prefix') ?? 'my-shule',
      });
      queue.on('error', () =>
        this.logger.warn(
          'Report queue unavailable; durable requests remain queued',
        ),
      );
      this.producers.set(name, queue);
    }
    return this.producers.get(name)!;
  }

  async submit(
    kind: ReportWorkKind,
    input: Record<string, any>,
    identityInput: unknown,
    options: { refreshCompleted?: boolean } = {},
  ) {
    const actor = this.context.requireStore();
    if (!actor.tenant_id || !actor.is_authenticated)
      throw new ForbiddenException('A school account is required');
    const identity = reportIdentity([REPORT_RENDERER_VERSION, identityInput]);
    const seed: RequestContextSeed = {
      tenant_id: actor.tenant_id,
      user_id: actor.user_id,
      role: actor.role,
      request_id: actor.request_id,
      permissions: [],
      is_authenticated: true,
      session_id: null,
      client_ip: null,
      user_agent: 'report-worker',
      method: 'JOB',
      path: '/internal/report-work',
      started_at: new Date().toISOString(),
    };
    const row = await this.db.withRequestTransaction(async () => {
      // Serialize admission per tenant across all API replicas. Duplicates bypass quotas.
      await this.db.query(
        'SELECT pg_advisory_xact_lock(hashtextextended($1,0))',
        [`report-admission:${actor.tenant_id}`],
      );
      const previous = await this.db.query<ReportWorkRow>(
        `SELECT * FROM report_work WHERE tenant_id=$1 AND actor_user_id=$2
        AND kind=$3 AND identity=$4 FOR UPDATE`,
        [actor.tenant_id, actor.user_id, kind, identity],
      );
      const existing = previous.rows[0];
      if (
        existing &&
        existing.state !== 'failed' &&
        !(options.refreshCompleted && existing.state === 'completed') &&
        Date.parse(existing.expires_at) > Date.now()
      )
        return existing;
      const active = await this.db.query<{ count: string }>(
        `SELECT count(*) FROM report_work
        WHERE tenant_id=$1 AND state IN ('queued','running')`,
        [actor.tenant_id],
      );
      if (Number(active.rows[0].count) >= 20)
        throw new HttpException(
          'This school already has 20 report tasks waiting. Existing tasks are safe; try again shortly.',
          429,
        );
      const result = await this.db.query<ReportWorkRow>(
        `INSERT INTO report_work(tenant_id,actor_user_id,kind,identity,context,input)
        VALUES($1,$2,$3,$4,$5::jsonb,$6::jsonb)
        ON CONFLICT(tenant_id,actor_user_id,kind,identity) DO UPDATE SET state='queued',attempts=0,
          result=NULL,error_code=NULL,progress='{}',lease_token=NULL,lease_until=NULL,available_at=now(),
          expires_at=now()+interval '1 day',updated_at=now(),context=EXCLUDED.context,input=EXCLUDED.input
        RETURNING *`,
        [
          actor.tenant_id,
          actor.user_id,
          kind,
          identity,
          JSON.stringify(seed),
          JSON.stringify(input),
        ],
      );
      return result.rows[0];
    });
    return this.publicState(row);
  }

  async owned(id: string): Promise<ReportWorkRow> {
    const actor = this.context.requireStore();
    if (!/^[a-f0-9-]{36}$/i.test(id))
      throw new NotFoundException('Report task not found');
    const result = await this.db.query<ReportWorkRow>(
      `SELECT * FROM report_work WHERE tenant_id=$1 AND actor_user_id=$2 AND id=$3::uuid`,
      [actor.tenant_id, actor.user_id, id],
    );
    if (!result.rows[0]) throw new NotFoundException('Report task not found');
    const row = result.rows[0];
    if (Date.parse(row.expires_at) <= Date.now())
      throw new ConflictException(
        'Report task expired. Prepare the report again.',
      );
    await this.authorize(row);
    return row;
  }
  async status(id: string) {
    return this.publicState(await this.owned(id));
  }
  async recent() {
    const actor = this.context.requireStore();
    const result = await this.db.query(
      `SELECT id AS job_id,kind,state,progress,created_at::text,expires_at::text,error_code
      FROM report_work WHERE tenant_id=$1 AND actor_user_id=$2 AND expires_at>now() ORDER BY created_at DESC LIMIT 20`,
      [actor.tenant_id, actor.user_id],
    );
    return result.rows;
  }
  async retry(id: string) {
    const row = await this.owned(id);
    if (row.state !== 'failed') return this.publicState(row);
    return this.db.withRequestTransaction(async () => {
      await this.db.query(
        'SELECT pg_advisory_xact_lock(hashtextextended($1,0))',
        [`report-admission:${row.tenant_id}`],
      );
      const updated = await this.db.query<ReportWorkRow>(
        `UPDATE report_work SET state='queued',attempts=0,error_code=NULL,
        lease_token=NULL,lease_until=NULL,available_at=now(),updated_at=now(),
        input=CASE WHEN kind IN ('generate_scope','generate_regeneration_scope') THEN input || '{"offset":0}'::jsonb ELSE input END,
        result=CASE WHEN kind IN ('generate_scope','generate_regeneration_scope') THEN NULL ELSE result END,progress='{}'::jsonb
        WHERE tenant_id=$1 AND actor_user_id=$2 AND id=$3::uuid AND state='failed'
          AND (SELECT count(*) FROM report_work WHERE tenant_id=$1 AND state IN ('queued','running'))<20 RETURNING *`,
        [row.tenant_id, row.actor_user_id, row.id],
      );
      if (!updated.rows.length)
        throw new ConflictException(
          'The task changed or this school has too many pending tasks. Refresh and retry.',
        );
      return this.publicState(updated.rows[0]);
    });
  }
  private publicState(row: ReportWorkRow) {
    return {
      job_id: row.id,
      state: row.state,
      status_url: `/exams/report-cards/jobs/${row.id}`,
      progress: row.progress,
      ...(['completed', 'failed'].includes(row.state)
        ? { result: row.result }
        : {}),
      ...(row.state === 'failed'
        ? {
            message:
              row.error_code === 'REPORT_CHANGED'
                ? 'Report data changed. Regenerate or preview the current scope and retry.'
                : 'The report task failed. Completed academic records are safe. Retry; contact the administrator if it fails again.',
          }
        : {}),
    };
  }

  private async authorize(row: ReportWorkRow, apply = false) {
    // Never trust permissions stored when queued. Membership, role and module may
    // have been revoked while the task was waiting.
    const access = await this.db.query<{ permission: string }>(
      `WITH active_roles AS (
      SELECT membership.role_id FROM tenant_memberships membership
      WHERE membership.tenant_id=$1 AND membership.user_id=$2 AND membership.status='active'
      UNION SELECT assignment.role_id FROM user_roles assignment WHERE assignment.tenant_id=$1
        AND assignment.user_id=$2 AND upper(assignment.status::text)='ACTIVE' AND assignment.deleted_at IS NULL
    ) SELECT DISTINCT permission.resource || ':' || permission.action AS permission
      FROM active_roles active JOIN roles role ON role.tenant_id=$1 AND role.id=active.role_id AND role.code=$3
      JOIN role_permissions rp ON rp.tenant_id=$1 AND rp.role_id=role.id
      JOIN permissions permission ON permission.tenant_id=$1 AND permission.id=rp.permission_id
      JOIN users account ON account.id=$2 AND account.status='active'`,
      [row.tenant_id, row.actor_user_id, row.context.role],
    );
    const permissions = access.rows.map((value) => value.permission);
    const needed = row.kind.startsWith('generate')
      ? 'exams:write'
      : 'exams:read';
    if (
      !permissions.some((value) => [needed, 'exams:*', '*:*'].includes(value))
    )
      throw new ForbiddenException('Report permission has been revoked');
    if (await this.modules.findFirstMissingModule(row.tenant_id, ['exams']))
      throw new ForbiddenException('The exams module is disabled');
    if (apply) this.context.setPermissions(permissions);
  }

  async dispatch() {
    if (!this.isWorker() || this.dispatching) return;
    this.dispatching = true;
    try {
      // Dispatch only a bounded number of IDs into each queue. A backed-up Redis
      // queue never receives a fresh duplicate every minute from every replica.
      for (const [queueName, bulk] of [
        [REPORT_WORK_QUEUE, false],
        [REPORT_WORK_BULK_QUEUE, true],
      ] as const) {
        if (
          (this.lane === 'interactive' && bulk) ||
          (this.lane === 'bulk' && !bulk)
        )
          continue;
        const producer = this.producer(queueName);
        const counts = await producer.getJobCounts('waiting', 'delayed');
        const pending = (counts.waiting ?? 0) + (counts.delayed ?? 0);
        if (pending >= 64) continue;
        const rows = await this.prisma.$queryRawUnsafe<
          Array<{ id: string; tenant_id: string; dispatch_version: number }>
        >(
          `
          WITH candidates AS (SELECT work.id FROM report_work work
            WHERE work.expires_at>now() AND work.available_at<=now() AND work.attempts<3
              AND (work.kind IN ('export','generate_batch','generate_scope','generate_regeneration_scope'))=$1
              AND (work.state='queued' OR (work.state='running' AND work.lease_until<now()))
              AND work.id=(SELECT first.id FROM report_work first WHERE first.tenant_id=work.tenant_id
                AND first.expires_at>now() AND first.available_at<=now() AND first.attempts<3
                AND (first.kind IN ('export','generate_batch','generate_scope','generate_regeneration_scope'))=$1
                AND (first.state='queued' OR (first.state='running' AND first.lease_until<now()))
                ORDER BY first.available_at,first.created_at,first.id LIMIT 1)
              AND NOT EXISTS(SELECT 1 FROM report_work busy WHERE busy.tenant_id=work.tenant_id
                AND busy.id<>work.id AND busy.state='running' AND busy.lease_until>now()
                AND (busy.kind IN ('export','generate_batch','generate_scope','generate_regeneration_scope'))=$1)
            ORDER BY work.available_at,work.created_at LIMIT $2 FOR UPDATE SKIP LOCKED)
          UPDATE report_work work SET available_at=now()+interval '5 minutes',dispatch_version=dispatch_version+1
          FROM candidates WHERE work.id=candidates.id RETURNING work.id,work.tenant_id,work.dispatch_version`,
          bulk,
          Math.min(32, 64 - pending),
        );
        if (rows.length)
          await producer.addBulk(
            rows.map((row) => ({
              name: 'report.work',
              data: row,
              opts: {
                jobId: `${row.id}-${row.dispatch_version}`,
                attempts: 1,
                removeOnComplete: true,
                removeOnFail: { age: 3600, count: 1000 },
              },
            })),
          );
      }
      await this.prisma
        .$executeRawUnsafe(`UPDATE report_work SET state='failed',error_code='REPORT_RETRY_EXHAUSTED',updated_at=now()
        WHERE state IN ('queued','running') AND (lease_until IS NULL OR lease_until<now()) AND (attempts>=3 OR expires_at<=now())`);
    } catch (error) {
      this.logger.warn(
        `Report dispatch deferred: ${error instanceof Error ? error.name : 'unavailable'}`,
      );
    } finally {
      this.dispatching = false;
    }
  }

  async execute(delivery: {
    id: string;
    tenant_id: string;
    dispatch_version: number;
  }) {
    // Fetch only using the tenant from the internal dispatcher, then enter RLS scope.
    const rows = await this.prisma.$queryRawUnsafe<ReportWorkRow[]>(
      `SELECT * FROM report_work WHERE tenant_id=$1 AND id=$2::uuid`,
      delivery.tenant_id,
      delivery.id,
    );
    const initial = rows[0];
    if (!initial || initial.state === 'completed' || initial.state === 'failed')
      return;
    if (
      initial.context.tenant_id !== initial.tenant_id ||
      initial.context.user_id !== initial.actor_user_id
    )
      throw new ForbiddenException(
        'Report task identity does not match its stored context',
      );
    return this.context.run(initial.context, async () => {
      const token = randomUUID();
      const row = await this.db.withRequestTransaction(async () => {
        await this.db.query(
          'SELECT pg_advisory_xact_lock(hashtextextended($1,0))',
          [`report-admission:${initial.tenant_id}`],
        );
        const claimed = await this.db.query<ReportWorkRow>(
          `UPDATE report_work work SET state='running',attempts=attempts+1,
          lease_token=$3::uuid,lease_until=now()+interval '90 seconds',updated_at=now()
          WHERE tenant_id=$1 AND id=$2::uuid AND dispatch_version=$4 AND expires_at>now() AND attempts<3
            AND (state='queued' OR (state='running' AND lease_until<now()))
            AND NOT EXISTS(SELECT 1 FROM report_work other WHERE other.tenant_id=$1 AND other.id<>work.id
              AND other.state='running' AND other.lease_until>now()
              AND (other.kind IN ('export','generate_batch','generate_scope','generate_regeneration_scope'))=(work.kind IN ('export','generate_batch','generate_scope','generate_regeneration_scope'))) RETURNING *`,
          [initial.tenant_id, initial.id, token, delivery.dispatch_version],
        );
        return claimed.rows[0];
      });
      if (!row) {
        await this.db.query(
          `UPDATE report_work SET available_at=now()+interval '3 seconds'
          WHERE tenant_id=$1 AND id=$2::uuid AND dispatch_version=$3 AND state='queued'`,
          [initial.tenant_id, initial.id, delivery.dispatch_version],
        );
        return;
      }
      let lostLease = false;
      let renewing = false;
      let latestProgress = row.progress;
      const progress = async (value: Record<string, any>) => {
        if (lostLease)
          throw new ServiceUnavailableException('Report worker lease lost');
        const updated = await this.db.query(
          `UPDATE report_work SET progress=$4::jsonb,lease_until=now()+interval '90 seconds',updated_at=now()
          WHERE tenant_id=$1 AND id=$2::uuid AND lease_token=$3::uuid AND state='running' AND lease_until>now() RETURNING id`,
          [row.tenant_id, row.id, token, JSON.stringify(value)],
        );
        if (!updated.rows.length) {
          lostLease = true;
          throw new ServiceUnavailableException('Report worker lease lost');
        }
        latestProgress = value;
      };
      const heartbeat = setInterval(() => {
        if (renewing) return;
        renewing = true;
        void this.db
          .query(
            `UPDATE report_work SET lease_until=now()+interval '90 seconds'
          WHERE tenant_id=$1 AND id=$2::uuid AND lease_token=$3::uuid AND state='running' AND lease_until>now() RETURNING id`,
            [row.tenant_id, row.id, token],
          )
          .then((result) => {
            if (!result.rows.length) lostLease = true;
          })
          .catch(() => {
            lostLease = true;
          })
          .finally(() => {
            renewing = false;
          });
      }, 15000);
      try {
        await this.authorize(row, true);
        const handler = this.handlers.get(row.kind);
        if (!handler) throw new ConflictException('Unsupported report task');
        const result = await handler(row, progress);
        await progress({ ...latestProgress, stage: 'saved' });
        if (result.__continue) {
          await this.db.query(
            `UPDATE report_work SET state='queued',input=$4::jsonb,result=$5::jsonb,progress=$5::jsonb,
            attempts=0,lease_until=NULL,lease_token=NULL,available_at=now(),updated_at=now()
            WHERE tenant_id=$1 AND id=$2::uuid AND lease_token=$3::uuid AND lease_until>now()`,
            [
              row.tenant_id,
              row.id,
              token,
              JSON.stringify(result.input),
              JSON.stringify(result.result),
            ],
          );
          return;
        }
        const partialFailure = result.queue_status === 'failed';
        await this.db.withRequestTransaction(async () => {
          const saved = await this.db.query(
            `UPDATE report_work SET state=$5,result=$4::jsonb,lease_until=NULL,updated_at=now(),error_code=$6
            WHERE tenant_id=$1 AND id=$2::uuid AND lease_token=$3::uuid AND state='running' AND lease_until>now() RETURNING id`,
            [
              row.tenant_id,
              row.id,
              token,
              JSON.stringify(result),
              partialFailure ? 'failed' : 'completed',
              partialFailure ? 'REPORT_PARTIAL_FAILURE' : null,
            ],
          );
          if (saved.rows.length && row.kind === 'pdf')
            await this.recordOutcome(row, 'completed', token);
        });
        this.logger.log(
          JSON.stringify({
            event: partialFailure
              ? 'report_work.partial_failure'
              : 'report_work.completed',
            job_id: row.id,
            tenant_id: row.tenant_id,
            kind: row.kind,
            attempt: row.attempts,
          }),
        );
      } catch (error) {
        const permanent =
          error instanceof HttpException && error.getStatus() < 500;
        await this.db.withRequestTransaction(async () => {
          const failed = await this.db.query(
            `UPDATE report_work SET state=$4,error_code=$5,lease_until=NULL,
          available_at=now()+($6::int * interval '1 second'),updated_at=now()
          WHERE tenant_id=$1 AND id=$2::uuid AND lease_token=$3::uuid AND state='running' RETURNING state`,
            [
              row.tenant_id,
              row.id,
              token,
              permanent || row.attempts >= 3 ? 'failed' : 'queued',
              error instanceof ConflictException
                ? 'REPORT_CHANGED'
                : 'REPORT_UNAVAILABLE',
              Math.min(60, 3 * 2 ** row.attempts),
            ],
          );
          if (failed.rows[0]?.state === 'failed')
            await this.recordOutcome(row, 'failed', token);
        });
        this.logger.error(
          `Report task ${row.id} failed on attempt ${row.attempts}`,
          error instanceof Error ? error.stack : undefined,
        );
      } finally {
        clearInterval(heartbeat);
      }
    });
  }
}
