import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from '../src/database/database.service';
import { RequestContextService } from '../src/common/request-context/request-context.service';
import { ReportWorkService } from '../src/modules/exams/services/report-work.service';
import {
  REPORT_INFRASTRUCTURE_SCHEMA,
  REPORT_SOURCE_TRIGGERS,
} from '../src/modules/exams/services/report-infrastructure-schema';
import { ReportCardArtifactsService } from '../src/modules/exams/services/report-card-artifacts.service';
import { ReportCardTemplateService } from '../src/modules/exams/services/report-card-template.service';
import { REPORT_RENDERER_VERSION } from '../src/modules/exams/services/report-artifact-identity';
import { DatabaseFileStorageService } from '../src/common/uploads/database-file-storage.service';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as pause } from 'node:timers/promises';
import Redis from 'ioredis';

describe('Durable report work against PostgreSQL with forced RLS', () => {
  let pool: Pool, db: DatabaseService, work: ReportWorkService;
  const context = new RequestContextService();
  const actor = randomUUID();
  const inSchool = <T>(tenant: string, fn: () => T, user = actor) =>
    context.run(
      {
        tenant_id: tenant,
        user_id: user,
        role: 'exams_manager',
        request_id: randomUUID(),
        permissions: ['exams:read', 'exams:write'],
        is_authenticated: true,
        session_id: null,
        client_ip: null,
        user_agent: null,
        method: 'TEST',
        path: '/',
        started_at: new Date().toISOString(),
      },
      fn,
    );
  const query = (sql: string, args: unknown[] = []) => pool.query(sql, args);
  const delivery = async (id: string) =>
    (
      await query(
        'SELECT id,tenant_id,dispatch_version FROM report_work WHERE id=$1',
        [id],
      )
    ).rows[0];
  const state = async (id: string) =>
    (await query('SELECT * FROM report_work WHERE id=$1', [id])).rows[0];

  beforeAll(async () => {
    const url = new URL(
      process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL!,
    );
    if (
      !['localhost', '127.0.0.1'].includes(url.hostname) ||
      !url.pathname.includes('disposable')
    )
      throw new Error('Use disposable local PostgreSQL');
    pool = new Pool({
      connectionString: url.toString(),
      options: '-c search_path=report_infrastructure,public',
      max: 12,
    });
    await query('CREATE SCHEMA report_infrastructure');
    await query(REPORT_INFRASTRUCTURE_SCHEMA);
    await query(`CREATE TABLE users(id uuid PRIMARY KEY,status text);
      CREATE TABLE roles(tenant_id text,id uuid,code text);
      CREATE TABLE permissions(tenant_id text,id uuid,resource text,action text);
      CREATE TABLE role_permissions(tenant_id text,role_id uuid,permission_id uuid);
      CREATE TABLE tenant_memberships(tenant_id text,user_id uuid,role_id uuid,status text);
      CREATE TABLE user_roles(tenant_id text,user_id uuid,role_id uuid,status text,deleted_at timestamptz);
      CREATE TABLE tenants(tenant_id text,settings jsonb DEFAULT '{}');
      CREATE TABLE exam_report_card_signatures(tenant_id text,signer_user_id uuid,storage_path text);
      CREATE TABLE academics_class_teachers(tenant_id text,teacher_user_id uuid);
      CREATE TABLE students(tenant_id text,id uuid,first_name text,updated_at timestamptz DEFAULT now());
      CREATE TABLE exam_marks(tenant_id text,student_id uuid,score integer,status text,updated_at timestamptz DEFAULT now());
      CREATE TABLE student_report_cards(tenant_id text,id uuid,student_id uuid,metadata jsonb,
        status text DEFAULT 'draft_generated',is_current boolean DEFAULT true,verification_code text DEFAULT 'VERIFY');
      CREATE TABLE report_card_artifacts(tenant_id text,report_card_id uuid,artifact_type text,storage_key text,metadata jsonb);
      CREATE TABLE file_objects(id uuid DEFAULT gen_random_uuid(),tenant_id text,storage_path text,original_file_name text,
        mime_type text,size_bytes bigint,sha256 text,content bytea,metadata jsonb DEFAULT '{}',storage_backend text,
        object_storage_provider text,object_storage_bucket text,object_storage_key text,object_storage_etag text,
        retention_policy text,retention_expires_at timestamptz,created_at timestamptz DEFAULT now(),UNIQUE(tenant_id,storage_path));
      CREATE ROLE report_infrastructure_runtime NOLOGIN NOBYPASSRLS;
      GRANT USAGE ON SCHEMA report_infrastructure TO report_infrastructure_runtime;
      GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA report_infrastructure TO report_infrastructure_runtime;`);
    await query(REPORT_SOURCE_TRIGGERS);
    for (const table of [
      'exam_report_card_signatures',
      'academics_class_teachers',
    ]) {
      await query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY; ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;
        CREATE POLICY report_tenant ON ${table} USING(tenant_id=current_setting('app.tenant_id',true)) WITH CHECK(tenant_id=current_setting('app.tenant_id',true));`);
    }
    await query("INSERT INTO users VALUES($1,'active')", [actor]);
    for (const tenant of ['school-a', 'school-b']) {
      const role = randomUUID();
      await query("INSERT INTO roles VALUES($1,$2,'exams_manager');", [
        tenant,
        role,
      ]);
      await query("INSERT INTO tenant_memberships VALUES($1,$2,$3,'active')", [
        tenant,
        actor,
        role,
      ]);
      for (const action of ['read', 'write']) {
        const id = randomUUID();
        await query("INSERT INTO permissions VALUES($1,$2,'exams',$3)", [
          tenant,
          id,
          action,
        ]);
        await query('INSERT INTO role_permissions VALUES($1,$2,$3)', [
          tenant,
          role,
          id,
        ]);
      }
    }
    db = new DatabaseService(
      pool,
      context,
      { getRuntimeRoleName: () => 'report_infrastructure_runtime' } as never,
      { get: () => undefined } as never,
    );
    work = new ReportWorkService(
      db,
      {
        $queryRawUnsafe: async (sql: string, ...args: unknown[]) =>
          (await query(sql, args)).rows,
      } as never,
      context,
      {
        getBullConnectionOptions: () => {
          throw new Error('API must not call Redis');
        },
      } as never,
      { get: () => undefined } as never,
      { findFirstMissingModule: async () => null } as never,
    );
  });
  beforeEach(async () => {
    await query(
      'TRUNCATE report_work,report_source_versions,students,exam_marks,student_report_cards,report_pdf_cache,file_objects,report_object_uploads,exam_report_card_signatures,academics_class_teachers',
    );
    await query("UPDATE users SET status='active'");
    await query("UPDATE tenant_memberships SET status='active'");
  });
  afterAll(async () => {
    if (pool) {
      await query(
        'DROP SCHEMA report_infrastructure CASCADE; DROP ROLE report_infrastructure_runtime',
      );
      await pool.end();
    }
  });

  it('admits duplicate requests once without Redis and enforces tenant and actor ownership', async () => {
    const requests = await Promise.all(
      Array.from({ length: 25 }, () =>
        inSchool('school-a', () =>
          work.submit('pdf', { report_card_id: 'one' }, 'same'),
        ),
      ),
    );
    expect(new Set(requests.map((row) => row.job_id)).size).toBe(1);
    const id = requests[0].job_id;
    expect((await query('SELECT * FROM report_work')).rowCount).toBe(1);
    await expect(inSchool('school-b', () => work.status(id))).rejects.toThrow(
      /not found/,
    );
    await expect(
      inSchool('school-a', () => work.status(id), randomUUID()),
    ).rejects.toThrow(/not found/);
    expect(
      (await inSchool('school-b', () => db.query('SELECT * FROM report_work')))
        .rowCount,
    ).toBe(0);
  });

  it('requeues a completed PDF task when its artifact is missing while deduplicating concurrent repair',async()=>{
    const job=await inSchool('school-a',()=>work.submit('pdf',{},'repair'));
    work.register('pdf',async()=>({report_card_id:'one'}));
    await work.execute(await delivery(job.job_id));
    expect((await inSchool('school-a',()=>work.submit('pdf',{},'repair'))).state).toBe('completed');
    const repaired=await Promise.all(Array.from({length:5},()=>inSchool('school-a',()=>work.submit('pdf',{},'repair',{refreshCompleted:true}))));
    expect(new Set(repaired.map(row=>row.job_id))).toEqual(new Set([job.job_id]));
    expect((await state(job.job_id)).state).toBe('queued');
    expect((await state(job.job_id)).attempts).toBe(0);
  });

  it('bounds admission atomically per school without blocking another school', async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 24 }, (_, i) =>
        inSchool('school-a', () => work.submit('pdf', {}, i)),
      ),
    );
    expect(results.filter((row) => row.status === 'fulfilled')).toHaveLength(
      20,
    );
    expect(results.filter((row) => row.status === 'rejected')).toHaveLength(4);
    expect(
      (await inSchool('school-b', () => work.submit('pdf', {}, 1))).state,
    ).toBe('queued');
  });

  it('claims duplicate deliveries once and persists final progress', async () => {
    const job = await inSchool('school-a', () =>
      work.submit('pdf', {}, 'once'),
    );
    let executions = 0;
    work.register('pdf', async (_row, progress) => {
      executions++;
      await progress({ completed_students: 1 });
      return { report_card_id: 'one' };
    });
    const message = await delivery(job.job_id);
    await Promise.all([
      work.execute(message),
      work.execute(message),
      work.execute(message),
    ]);
    expect(executions).toBe(1);
    const saved = await state(job.job_id);
    expect(saved.state).toBe('completed');
    expect(saved.progress.completed_students).toBe(1);
  });

  it('isolates school lanes while another school can complete', async () => {
    const first = await inSchool('school-a', () =>
      work.submit('pdf', {}, 'first'),
    );
    const second = await inSchool('school-a', () =>
      work.submit('pdf', {}, 'second'),
    );
    const other = await inSchool('school-b', () =>
      work.submit('pdf', {}, 'other'),
    );
    let release!: () => void, started!: () => void;
    const gated = new Promise<void>((resolve) => {
      release = resolve;
    });
    const active = new Promise<void>((resolve) => {
      started = resolve;
    });
    work.register('pdf', async (row) => {
      if (row.id === first.job_id) {
        started();
        await gated;
      }
      return { done: true };
    });
    const running = work.execute(await delivery(first.job_id));
    await active;
    await work.execute(await delivery(second.job_id));
    await work.execute(await delivery(other.job_id));
    expect((await state(second.job_id)).state).toBe('queued');
    expect((await state(other.job_id)).state).toBe('completed');
    release();
    await running;
    await work.execute(await delivery(second.job_id));
    expect((await state(second.job_id)).state).toBe('completed');
  });

  it('retries transport failure, exhausts attempts, and supports explicit recovery', async () => {
    const job = await inSchool('school-a', () =>
      work.submit('pdf', {}, 'retry'),
    );
    work.register('pdf', async () => {
      throw new ServiceUnavailableException('Storage offline');
    });
    for (let attempt = 1; attempt <= 3; attempt++)
      await work.execute(await delivery(job.job_id));
    expect((await state(job.job_id)).state).toBe('failed');
    await inSchool('school-a', () => work.retry(job.job_id));
    work.register('pdf', async () => ({ done: true }));
    await work.execute(await delivery(job.job_id));
    expect((await state(job.job_id)).state).toBe('completed');
  });

  it('recovers an expired worker lease and ignores stale dispatch versions', async () => {
    const job = await inSchool('school-a', () =>
      work.submit('pdf', {}, 'restart'),
    );
    await query(
      "UPDATE report_work SET state='running',attempts=1,lease_until=now()-interval '2 minutes',dispatch_version=2 WHERE id=$1",
      [job.job_id],
    );
    let executed = 0;
    work.register('pdf', async () => {
      executed++;
      return { done: true };
    });
    await work.execute({
      ...(await delivery(job.job_id)),
      dispatch_version: 1,
    });
    expect(executed).toBe(0);
    await work.execute(await delivery(job.job_id));
    expect(executed).toBe(1);
    expect((await state(job.job_id)).attempts).toBe(2);
  });

  it.each(['generate_scope', 'generate_regeneration_scope'] as const)('checkpoints %s without losing completed work on the next delivery', async (kind) => {
    const job = await inSchool('school-a', () =>
      work.submit(kind, { offset: 0 }, 'checkpoint'),
    );
    work.register(kind, async (row) =>
      row.input.offset === 0
        ? {
            __continue: true,
            input: { offset: 25 },
            result: { completed_students: 25 },
          }
        : { completed_students: row.result!.completed_students + 5 },
    );
    await work.execute(await delivery(job.job_id));
    expect((await state(job.job_id)).state).toBe('queued');
    expect((await state(job.job_id)).input.offset).toBe(25);
    await work.execute(await delivery(job.job_id));
    expect((await state(job.job_id)).result.completed_students).toBe(30);
  });

  it.each(['generate_scope', 'generate_regeneration_scope'] as const)('reports partial failure truthfully and retry resets the %s cursor', async (kind) => {
    const job = await inSchool('school-a', () =>
      work.submit(kind, { offset: 25 }, 'partial'),
    );
    work.register(kind, async () => ({
      queue_status: 'failed',
      completed_students: 24,
      failed_students: 1,
    }));
    await work.execute(await delivery(job.job_id));
    expect((await state(job.job_id)).state).toBe('failed');
    await inSchool('school-a', () => work.retry(job.job_id));
    expect((await state(job.job_id)).input.offset).toBe(0);
    expect((await state(job.job_id)).result).toBeNull();
  });

  it('rechecks permission at execution and delivery after revocation', async () => {
    const job = await inSchool('school-a', () =>
      work.submit('pdf', {}, 'revoked'),
    );
    await query(
      "UPDATE tenant_memberships SET status='disabled' WHERE tenant_id='school-a'",
    );
    let executed = false;
    work.register('pdf', async () => {
      executed = true;
      return {};
    });
    await work.execute(await delivery(job.job_id));
    expect(executed).toBe(false);
    expect((await state(job.job_id)).state).toBe('failed');
    await expect(
      inSchool('school-a', () => work.status(job.job_id)),
    ).rejects.toThrow(/revoked/);
  });

  it('invalidates marks and comments transactionally without invalidating on timestamp or publication alone', async () => {
    const student = randomUUID();
    await inSchool('school-a', () =>
      db.query(
        "INSERT INTO students(tenant_id,id,first_name) VALUES('school-a',$1,'Learner')",
        [student],
      ),
    );
    const revision = async () =>
      (
        await query(
          "SELECT version::text FROM report_source_versions WHERE tenant_id='school-a' AND scope_key=$1",
          [`student:${student}`],
        )
      ).rows[0].version;
    const before = await revision();
    await inSchool('school-a', () =>
      db.query(
        "UPDATE students SET updated_at=now() WHERE tenant_id='school-a'",
      ),
    );
    expect(await revision()).toBe(before);
    await inSchool('school-a', () =>
      db.query(
        "INSERT INTO exam_marks(tenant_id,student_id,score,status) VALUES('school-a',$1,70,'locked')",
        [student],
      ),
    );
    const locked = await revision();
    await inSchool('school-a', () =>
      db.query(
        "UPDATE exam_marks SET status='published' WHERE tenant_id='school-a'",
      ),
    );
    expect(await revision()).toBe(locked);
    await inSchool('school-a', () =>
      db.query("UPDATE exam_marks SET score=71 WHERE tenant_id='school-a'"),
    );
    expect(await revision()).not.toBe(locked);
    const changed = await revision();
    await expect(
      inSchool('school-a', () =>
        db.withRequestTransaction(async () => {
          await db.query(
            "UPDATE exam_marks SET score=72 WHERE tenant_id='school-a'",
          );
          throw new Error('Rollback');
        }),
      ),
    ).rejects.toThrow('Rollback');
    expect(await revision()).toBe(changed);
    expect(
      (
        await inSchool('school-b', () =>
          db.query('SELECT * FROM report_source_versions'),
        )
      ).rowCount,
    ).toBe(0);
  });

  it('invalidates shared signer changes across schools without exposing another school through RLS', async () => {
    await query(
      "INSERT INTO exam_report_card_signatures VALUES('school-a',$1,'tenant/school-a/signature.png'),('school-b',$1,'tenant/school-b/signature.png')",
      [actor],
    );
    const before = (
      await query(
        "SELECT tenant_id,version::int FROM report_source_versions WHERE scope_key='school' ORDER BY tenant_id",
      )
    ).rows;
    await inSchool('school-a', () =>
      db.query("UPDATE users SET status='disabled' WHERE id=$1", [actor]),
    );
    const after = (
      await query(
        "SELECT tenant_id,version::int FROM report_source_versions WHERE scope_key='school' ORDER BY tenant_id",
      )
    ).rows;
    expect(after).toEqual(
      before.map((row) => ({ ...row, version: row.version + 1 })),
    );
    expect(
      (
        await inSchool('school-a', () =>
          db.query('SELECT * FROM exam_report_card_signatures'),
        )
      ).rows.map((row) => row.tenant_id),
    ).toEqual(['school-a']);
    await expect(
      inSchool('school-a', () =>
        db.query('SELECT myshule_report_signer_changed()'),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it('invalidates changed image bytes only when a logo or signature references the object', async () => {
    const storage = new DatabaseFileStorageService(db, undefined, {
      get: () => false,
    } as never);
    const save = (path: string) =>
      inSchool('school-a', () =>
        storage.save({
          tenantId: 'school-a',
          storagePath: path,
          originalFileName: 'signature.png',
          mimeType: 'image/png',
          sizeBytes: 1,
          buffer: Buffer.from('a'),
        }),
      );
    await save('tenant/school-a/signature.png');
    await save('tenant/school-a/unrelated.png');
    await query(
      "INSERT INTO exam_report_card_signatures VALUES('school-a',$1,'tenant/school-a/signature.png')",
      [actor],
    );
    const version = async () =>
      (
        await query(
          "SELECT version::int FROM report_source_versions WHERE tenant_id='school-a' AND scope_key='school'",
        )
      ).rows[0].version;
    const before = await version();
    await inSchool('school-a', () =>
      db.query(
        "UPDATE file_objects SET sha256='new' WHERE tenant_id='school-a' AND storage_path='tenant/school-a/unrelated.png'",
      ),
    );
    expect(await version()).toBe(before);
    await inSchool('school-a', () =>
      db.query(
        "UPDATE file_objects SET sha256='new' WHERE tenant_id='school-a' AND storage_path='tenant/school-a/signature.png'",
      ),
    );
    expect(await version()).toBeGreaterThan(before);
  });

  it('persists one artifact winner, reuses its bytes and retains academic files when temporary cleanup fails', async () => {
    const cardId = randomUUID(),
      student = randomUUID();
    const payload = new ReportCardTemplateService().buildPayload(
      {
        school: { name: 'School' },
        student: { full_name: 'Learner' },
        subjects: [
          {
            subject_id: 'math',
            subject_name: 'Math',
            score: 80,
            max_score: 100,
          },
        ],
      },
      '2026-09-23T10:00:00Z',
    );
    await query(
      `INSERT INTO student_report_cards(tenant_id,id,student_id,metadata) VALUES('school-a',$1,$2,$3)`,
      [
        cardId,
        student,
        JSON.stringify({
          report_card: payload,
          source_revision: '[]',
          renderer_version: REPORT_RENDERER_VERSION,
        }),
      ],
    );
    const objects = new Map<string, Buffer>();
    let deleteFails = false;
    const objectStorage = {
      putObject: async (input: any) => {
        objects.set(input.storagePath, input.buffer);
        return {
          provider: 'r2',
          bucket: 'test',
          key: input.storagePath,
          sha256: createHash('sha256').update(input.buffer).digest('hex'),
        };
      },
      getObject: async (input: any) => {
        const content = objects.get(input.storagePath)!;
        return {
          content,
          sha256: createHash('sha256').update(content).digest('hex'),
        };
      },
      deleteObject: async (input: any) => {
        if (deleteFails) throw new Error('R2 unavailable');
        objects.delete(input.storagePath);
      },
    };
    const storage = new DatabaseFileStorageService(
      db,
      objectStorage as never,
      { get: () => true } as never,
    );
    const artifacts = new ReportCardArtifactsService(
      {
        executeSql: (sql: string, values: any[]) => db.query(sql, values),
      } as never,
      storage,
      db,
      context,
      work,
    );
    const card = await inSchool('school-a', () => artifacts.load(cardId));
    const paths = await Promise.all([
      inSchool('school-a', () => artifacts.ensurePdf(card)),
      inSchool('school-a', () => artifacts.ensurePdf(card)),
    ]);
    expect(new Set(paths).size).toBe(1);
    const pdf = await inSchool('school-a', () => artifacts.read(cardId));
    expect(pdf.content.subarray(0, 4).toString()).toBe('%PDF');
    expect(await inSchool('school-a', () => artifacts.ensurePdf(card))).toBe(
      paths[0],
    );
    expect(objects.size).toBe(2); // Losing upload remains staged until its safe cleanup deadline.
    expect(
      (
        await query(
          "SELECT * FROM file_objects WHERE retention_policy='academic-record'",
        )
      ).rowCount,
    ).toBe(1);
    await query(
      "UPDATE file_objects SET retention_expires_at=now()-interval '1 second' WHERE retention_policy='report-staging'",
    );
    deleteFails = true;
    await expect(
      storage.purgeExpiredFileObjects({
        now: new Date().toISOString(),
        retentionPolicies: ['report-staging'],
      }),
    ).rejects.toThrow('R2 unavailable');
    expect((await query('SELECT * FROM file_objects')).rowCount).toBe(2);
    deleteFails = false;
    expect(
      (
        await storage.purgeExpiredFileObjects({
          now: new Date().toISOString(),
          retentionPolicies: ['report-staging'],
        })
      ).deleted_count,
    ).toBe(1);
    expect(objects.size).toBe(1);
    expect(
      (await inSchool('school-a', () => artifacts.read(cardId))).checksumSha256,
    ).toBe(pdf.checksumSha256);
    await query("INSERT INTO report_source_versions VALUES('school-a',$1,1)", [
      `student:${student}`,
    ]);
    await expect(
      inSchool('school-a', () => artifacts.read(cardId)),
    ).rejects.toThrow(/changed/);
  });

  it('delivers through real Redis and recovers durable requests after Redis loses its entire queue', async () => {
    const port = await new Promise<number>((resolve) => {
      const server = createServer();
      server.listen(0, '127.0.0.1', () => {
        const port = (server.address() as any).port;
        server.close(() => resolve(port));
      });
    });
    const child = spawn(
      process.env.TEST_REDIS_BINARY ?? 'redis-server',
      [
        '--bind',
        '127.0.0.1',
        '--port',
        String(port),
        '--save',
        '',
        '--appendonly',
        'no',
      ],
      { windowsHide: true, stdio: 'ignore' },
    );
    const redis = new Redis({
      host: '127.0.0.1',
      port,
      maxRetriesPerRequest: 1,
      retryStrategy: () => 100,
    });
    redis.on('error', () => undefined);
    let redisWork: ReportWorkService | undefined;
    try {
      await new Promise<void>((resolve, reject) => {
        redis.once('ready', resolve);
        child.once('error', reject);
      });
      const config = {
        'app.runtime': 'reports-worker',
        'reportCards.workerLane': 'interactive',
        'reportCards.workerConcurrency': 1,
        'queue.prefix': `report-test-${randomUUID()}`,
      };
      redisWork = new ReportWorkService(
        db,
        {
          runSchemaBootstrap: async () => undefined,
          $queryRawUnsafe: async (sql: string, ...args: any[]) =>
            (await query(sql, args)).rows,
          $executeRawUnsafe: async (sql: string, ...args: any[]) =>
            (await query(sql, args)).rowCount,
        } as never,
        context,
        {
          getBullConnectionOptions: () => ({ host: '127.0.0.1', port }),
        } as never,
        { get: (key: keyof typeof config) => config[key] } as never,
        { findFirstMissingModule: async () => null } as never,
      );
      let calls = 0;
      redisWork.register('pdf', async () => {
        calls++;
        return { done: true };
      });
      const job = await inSchool('school-a', () =>
        work.submit('pdf', {}, 'redis'),
      );
      // Model the crash between reserving dispatch and delivering to Redis.
      await query(
        "UPDATE report_work SET dispatch_version=1,available_at=now()+interval '5 minutes' WHERE id=$1",
        [job.job_id],
      );
      await redis.flushdb();
      await query('UPDATE report_work SET available_at=now() WHERE id=$1', [
        job.job_id,
      ]);
      await redisWork.onApplicationBootstrap();
      const until = Date.now() + 15000;
      while (
        (await state(job.job_id)).state !== 'completed' &&
        Date.now() < until
      )
        await pause(50);
      expect((await state(job.job_id)).state).toBe('completed');
      expect(calls).toBe(1);
      expect((await state(job.job_id)).dispatch_version).toBe(2);
    } finally {
      await redisWork?.onModuleDestroy();
      redis.disconnect();
      if (child.exitCode === null) {
        const closed = new Promise((resolve) => child.once('exit', resolve));
        child.kill();
        await closed;
      }
    }
  }, 30000);
});
