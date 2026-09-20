import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { createHash } from 'node:crypto';
import { Pool } from 'pg';
import { RequestContextService } from '../common/request-context/request-context.service';
import type { RequestContextState } from '../common/request-context/request-context.types';
import { DatabaseSecurityService } from './database-security.service';

const DEFAULT_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/shule_hub';

export function buildTenantSessionSettingsQuery(tenantId: string, userId: string | null | undefined): Prisma.Sql {
  return Prisma.sql`
    SELECT
      set_config('app.tenant_id', ${tenantId}, true),
      set_config('app.user_id', ${userId ?? ''}, true)
  `;
}

export function buildRequestSessionSettingsQuery(context: RequestContextState): Prisma.Sql {
  return Prisma.sql`
    SELECT
      set_config('app.tenant_id', ${context.tenant_id ?? ''}, true),
      set_config('app.user_id', ${context.user_id}, true),
      set_config('app.request_id', ${context.request_id}, true),
      set_config('app.role', ${context.role ?? ''}, true),
      set_config('app.session_id', ${context.session_id ?? ''}, true),
      set_config('app.method', ${context.method ?? ''}, true),
      set_config('app.path', ${context.path ?? ''}, true),
      set_config('app.client_ip', ${context.client_ip ?? ''}, true),
      set_config('app.user_agent', ${context.user_agent ?? ''}, true),
      set_config('app.started_at', ${context.started_at ?? ''}, true),
      set_config('app.is_authenticated', ${context.is_authenticated ? 'true' : 'false'}, true)
  `;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly connectionPool: Pool;
  private static readonly SCHEMA_BOOTSTRAP_LOCK_KEY = 'my_shule_prisma_schema_bootstrap';
  private static schemaBootstrapQueue: Promise<void> = Promise.resolve();
  private static schemaBootstrapByHash = new Map<string, Promise<void>>();
  private static schemaBootstrapPool: Pool | null = null;

  constructor(
    private readonly requestContext: RequestContextService,
    private readonly databaseSecurityService: DatabaseSecurityService,
  ) {
    const connectionPool = new Pool({
      connectionString: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
      application_name: 'my-shule-prisma',
      connectionTimeoutMillis: 10000,
    });
    super({
      adapter: new PrismaPg(connectionPool, { disposeExternalPool: true }),
    });
    this.connectionPool = connectionPool;
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
      await this.applyRuntimeRole(tx);
      await tx.$queryRaw(buildTenantSessionSettingsQuery(tenantId, userId));
      return callback(tx);
    }, {
      maxWait: 30000,
      timeout: 60000,
    });
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<{ rows: T[], rowCount: number }> {
    const requestContext = this.requestContext?.getStore();
    const inferredTenantId = this.inferFirstParameterTenantId(sql, params[0]);
    const expectsRows = this.rawSqlReturnsRows(sql);

    if (requestContext) {
      return this.$transaction(async (tx) => {
        await this.applyRuntimeRole(tx);
        await tx.$queryRaw(buildRequestSessionSettingsQuery(requestContext));
        return this.executeRawQuery<T>(tx, sql, params, expectsRows);
      }, {
        maxWait: 30000,
        timeout: 60000,
      });
    }

    if (inferredTenantId) {
      return this.executeWithTenant(inferredTenantId, null, async (tx: any) => {
        return this.executeRawQuery<T>(tx, sql, params, expectsRows);
      });
    }

    return this.executeRawQuery<T>(this, sql, params, expectsRows);
  }

  private async applyRuntimeRole(
    client: Pick<Prisma.TransactionClient, '$executeRawUnsafe'>,
  ): Promise<void> {
    const runtimeRoleName = this.databaseSecurityService?.getRuntimeRoleName();

    if (!runtimeRoleName) {
      return;
    }

    const quotedRoleName = `"${runtimeRoleName.replace(/"/g, '""')}"`;
    await client.$executeRawUnsafe(`SET LOCAL ROLE ${quotedRoleName}`);
  }

  private inferFirstParameterTenantId(sql: string, firstParam: unknown): string | null {
    if (typeof firstParam !== 'string' || !firstParam.trim()) {
      return null;
    }

    const firstParameterIsTenant =
      /\b(?:[a-z_][a-z0-9_]*\.)?tenant_id(?:::text)?\s*=\s*\$1(?:::text)?\b/i.test(sql)
      || /\$1(?:::text)?\s*=\s*(?:[a-z_][a-z0-9_]*\.)?tenant_id(?:::text)?\b/i.test(sql)
      || /\bINSERT\s+INTO\s+(?:[a-z_][a-z0-9_]*\.)?[a-z_][a-z0-9_]*\s*\(\s*tenant_id\b[\s\S]*?\)\s*(?:OVERRIDING\s+\w+\s+VALUE\s*)?VALUES\s*\(\s*\$1\b/i.test(sql);

    return firstParameterIsTenant ? firstParam.trim() : null;
  }

  private async executeRawQuery<T>(
    client: Pick<Prisma.TransactionClient, '$executeRawUnsafe' | '$queryRawUnsafe'>,
    sql: string,
    params: any[],
    expectsRows: boolean,
  ): Promise<{ rows: T[]; rowCount: number }> {
    if (!expectsRows) {
      const rowCount = await client.$executeRawUnsafe(sql, ...params);
      return { rows: [], rowCount };
    }

    const result = await client.$queryRawUnsafe<T[]>(sql, ...params);
    const rows = Array.isArray(result) ? result : [result];
    return { rows, rowCount: rows.length };
  }

  private rawSqlReturnsRows(sql: string): boolean {
    const normalized = sql.trim().replace(/^\/\*[\s\S]*?\*\/\s*/, '');

    if (/^(SELECT|WITH|SHOW|EXPLAIN|VALUES)\b/i.test(normalized)) {
      return true;
    }

    return /\bRETURNING\b/i.test(normalized);
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
    return this.$transaction(async (tx) => {
      await this.applyRuntimeRole(tx);
      if (store) {
        await tx.$queryRaw(buildRequestSessionSettingsQuery(store));
      }
      return callback(tx);
    }, {
      maxWait: 30000,
      timeout: 60000,
    });
  }
  async ping(): Promise<'up'> {
    const healthQuery = { text: 'SELECT 1', query_timeout: 5000 };
    await this.connectionPool.query(healthQuery);
    return 'up';
  }
  getPoolMetrics(): { totalCount: number; idleCount: number; waitingCount: number } {
    return {
      totalCount: this.connectionPool.totalCount,
      idleCount: this.connectionPool.idleCount,
      waitingCount: this.connectionPool.waitingCount,
    };
  }
  async synchronizeRequestSession(sessionId?: any): Promise<void> { return Promise.resolve(); }
}
