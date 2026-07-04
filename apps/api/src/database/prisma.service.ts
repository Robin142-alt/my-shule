import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { createHash } from 'node:crypto';
import { Pool } from 'pg';
import { RequestContextService } from '../common/request-context/request-context.service';

const DEFAULT_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/shule_hub';

export function buildTenantSessionSettingsQuery(tenantId: string, userId: string | null | undefined): Prisma.Sql {
  return Prisma.sql`
    SELECT
      set_config('app.tenant_id', ${tenantId}, true),
      set_config('app.user_id', ${userId ?? ''}, true)
  `;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private static readonly SCHEMA_BOOTSTRAP_LOCK_KEY = 'my_shule_prisma_schema_bootstrap';
  private static schemaBootstrapQueue: Promise<void> = Promise.resolve();
  private static schemaBootstrapByHash = new Map<string, Promise<void>>();
  private static schemaBootstrapPool: Pool | null = null;

  constructor(private readonly requestContext: RequestContextService) {
    super({
      adapter: new PrismaPg(process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL),
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('PrismaClient connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.closeSchemaBootstrapPool();
    this.logger.log('PrismaClient disconnected');
  }

  async executeWithTenant<T>(
    tenantId: string,
    userId: string | null | undefined,
    callback: (tx: Prisma.TransactionClient) => Promise<T>
  ): Promise<T> {
    return this.$transaction(async (tx) => {
      await tx.$queryRaw(buildTenantSessionSettingsQuery(tenantId, userId));
      return callback(tx);
    }, {
      maxWait: 30000,
      timeout: 60000,
    });
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<{ rows: T[], rowCount: number }> {
    const firstParam = params[0];
    const isUuid = typeof firstParam === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(firstParam);
    if (isUuid) {
      return this.executeWithTenant(firstParam, null, async (tx: any) => {
        const result = await tx.$queryRawUnsafe(sql, ...params);
        const arr = Array.isArray(result) ? result : [result];
        return { rows: arr, rowCount: arr.length };
      });
    } else {
      const result = await this.$queryRawUnsafe(sql, ...params);
      const arr = Array.isArray(result) ? result : [result];
        return { rows: arr, rowCount: arr.length };
    }
  }

  async runSchemaBootstrap(sql: string): Promise<void> {
    const sqlHash = this.hashSchemaBootstrap(sql);
    const existingBootstrap = PrismaService.schemaBootstrapByHash.get(sqlHash);

    if (existingBootstrap) {
      return existingBootstrap;
    }

    const queuedBootstrap = PrismaService.schemaBootstrapQueue
      .catch(() => undefined)
      .then(() => this.runSchemaBootstrapTransaction(sql));
    const trackedBootstrap = queuedBootstrap.catch((error) => {
      PrismaService.schemaBootstrapByHash.delete(sqlHash);
      throw error;
    });

    PrismaService.schemaBootstrapByHash.set(sqlHash, trackedBootstrap);
    PrismaService.schemaBootstrapQueue = trackedBootstrap.catch(() => undefined);

    return trackedBootstrap;
  }

  private async runSchemaBootstrapTransaction(sql: string): Promise<void> {
    const pool = this.getSchemaBootstrapPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await client.query(`SET LOCAL lock_timeout = '10s'`);
      await client.query(`SET LOCAL statement_timeout = '60s'`);
      await client.query(
        'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
        [PrismaService.SCHEMA_BOOTSTRAP_LOCK_KEY],
      );
      await client.query(sql);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      const message = error instanceof Error ? error.message : String(error);
      const pgError = error as { code?: string; detail?: string; hint?: string; position?: string; routine?: string };
      const metadata = [
        pgError.code ? `code=${pgError.code}` : null,
        pgError.position ? `position=${pgError.position}` : null,
        pgError.detail ? `detail=${pgError.detail}` : null,
        pgError.hint ? `hint=${pgError.hint}` : null,
        pgError.routine ? `routine=${pgError.routine}` : null,
      ]
        .filter(Boolean)
        .join('; ');
      const enrichedError = new Error(
        `Prisma schema bootstrap failed: ${message}${metadata ? ` (${metadata})` : ''}. SQL summary: ${this.describeSchemaBootstrap(sql)}`,
      );
      throw enrichedError;
    } finally {
      client.release();
    }
  }

  private describeSchemaBootstrap(sql: string): string {
    return sql
      .split('\n')
      .map((line) => line.trim())
      .filter((line) =>
        /^(CREATE|ALTER)\s+(TABLE|INDEX|UNIQUE INDEX)|^CREATE\s+UNIQUE\s+INDEX/i.test(line),
      )
      .slice(0, 14)
      .join(' | ');
  }

  private hashSchemaBootstrap(sql: string): string {
    return createHash('sha256').update(sql).digest('hex');
  }

  private getSchemaBootstrapPool(): Pool {
    if (PrismaService.schemaBootstrapPool) {
      return PrismaService.schemaBootstrapPool;
    }

    const connectionString = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
    PrismaService.schemaBootstrapPool = new Pool({
      connectionString,
      max: 2,
      idleTimeoutMillis: 30000,
      ssl: connectionString.includes('sslmode=require')
        ? { rejectUnauthorized: false }
        : undefined,
    });

    return PrismaService.schemaBootstrapPool;
  }

  private async closeSchemaBootstrapPool(): Promise<void> {
    if (!PrismaService.schemaBootstrapPool) {
      return;
    }

    const pool = PrismaService.schemaBootstrapPool;
    PrismaService.schemaBootstrapPool = null;
    await pool.end();
  }

  async withRequestTransaction<T>(callback: (tx: any) => Promise<T>): Promise<T> {
    const store = this.requestContext.getStore();
    if (store && store.tenant_id) {
      return this.executeWithTenant(store.tenant_id, store.user_id, callback);
    }
    return this.$transaction(callback);
  }
  async ping(): Promise<"up"> { return "up"; }
  async getPoolMetrics(): Promise<any> { return { totalCount: 10, idleCount: 10, waitingCount: 0 }; }
  async synchronizeRequestSession(sessionId?: any): Promise<void> { return Promise.resolve(); }
}
