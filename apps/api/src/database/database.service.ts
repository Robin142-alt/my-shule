import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import format from 'pg-format';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

import { RequestContextService } from '../common/request-context/request-context.service';
import { RequestContextState } from '../common/request-context/request-context.types';
import { SloMetricsService } from '../modules/observability/slo-metrics.service';
import { StructuredLoggerService } from '../modules/observability/structured-logger.service';
import { DATABASE_POOL } from './database.constants';
import { retryDatabaseOperation } from './database-retry';
import { DatabaseSecurityService } from './database-security.service';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private static readonly SCHEMA_BOOTSTRAP_LOCK_KEY = 'my_shule_schema_bootstrap';
  private static schemaBootstrapQueue: Promise<void> = Promise.resolve();
  private static schemaBootstrapByHash = new Map<string, Promise<void>>();
  private structuredLoggerRef: StructuredLoggerService | null | undefined;
  private sloMetricsRef: SloMetricsService | null | undefined;

  constructor(
    @Inject(DATABASE_POOL) private readonly pool: Pool,
    private readonly requestContext: RequestContextService,
    private readonly databaseSecurityService: DatabaseSecurityService,
    private readonly moduleRef: ModuleRef,
  ) {}

  async onModuleInit(): Promise<void> {
    await retryDatabaseOperation(
      this.logger,
      'PostgreSQL connection initialization',
      this.getConnectMaxRetries(),
      this.getConnectRetryDelayMs(),
      async () => {
        await this.pool.query('SELECT 1');
      },
    );
    this.logger.log('PostgreSQL connection pool initialized');
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  async acquireClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  async initializeRequestSession(client: PoolClient, context: RequestContextState): Promise<void> {
    await client.query('BEGIN');
    await this.applySessionConfig(client, context);
  }

  async synchronizeRequestSession(context: RequestContextState): Promise<void> {
    const client = context.db_client;

    if (!client) {
      return;
    }

    await this.applySessionConfig(client, context);
  }

  private async applySessionConfig(client: PoolClient, context: RequestContextState): Promise<void> {
    const runtimeRoleName = this.databaseSecurityService.getRuntimeRoleName();

    if (runtimeRoleName) {
      await client.query(format('SET LOCAL ROLE %I', runtimeRoleName));
    }

    await client.query(
      `
        SELECT
          set_config($1, $2, true),
          set_config($3, $4, true),
          set_config($5, $6, true),
          set_config($7, $8, true),
          set_config($9, $10, true),
          set_config($11, $12, true),
          set_config($13, $14, true),
          set_config($15, $16, true),
          set_config($17, $18, true),
          set_config($19, $20, true),
          set_config($21, $22, true)
      `,
      [
        'app.tenant_id',
        context.tenant_id ?? '',
        'app.user_id',
        context.user_id,
        'app.request_id',
        context.request_id,
        'app.role',
        context.role ?? '',
        'app.session_id',
        context.session_id ?? '',
        'app.method',
        context.method ?? '',
        'app.path',
        context.path ?? '',
        'app.client_ip',
        context.client_ip ?? '',
        'app.user_agent',
        context.user_agent ?? '',
        'app.started_at',
        context.started_at ?? '',
        'app.is_authenticated',
        context.is_authenticated ? 'true' : 'false',
      ],
    );
  }

  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values: unknown[] = [],
  ): Promise<QueryResult<T>> {
    const requestContext = this.requestContext.getStore();

    if (requestContext?.db_client) {
      return this.executeObservedQuery(text, values, () =>
        requestContext.db_client!.query<T>(text, values),
      );
    }

    if (requestContext && this.isSafePublicReadOnlyRequestQuery(requestContext, text)) {
      return this.executeObservedQuery(text, values, () => this.pool.query<T>(text, values));
    }

    if (requestContext) {
      return this.executeInScopedRequestSession(requestContext, (client) =>
        this.executeObservedQuery(text, values, () => client.query<T>(text, values)),
      );
    }

    return this.executeObservedQuery(text, values, () => this.pool.query<T>(text, values));
  }

  async runSchemaBootstrap(sql: string): Promise<void> {
    const sqlHash = this.hashSchemaBootstrap(sql);
    const existingBootstrap = DatabaseService.schemaBootstrapByHash.get(sqlHash);

    if (existingBootstrap) {
      return existingBootstrap;
    }

    const queuedBootstrap = DatabaseService.schemaBootstrapQueue
      .catch(() => undefined)
      .then(() => this.runSchemaBootstrapTransaction(sql));
    const trackedBootstrap = queuedBootstrap.catch((error) => {
      DatabaseService.schemaBootstrapByHash.delete(sqlHash);
      throw error;
    });

    DatabaseService.schemaBootstrapByHash.set(sqlHash, trackedBootstrap);
    DatabaseService.schemaBootstrapQueue = trackedBootstrap.catch(() => undefined);

    return trackedBootstrap;
  }

  private hashSchemaBootstrap(sql: string): string {
    return createHash('sha256').update(sql).digest('hex');
  }

  private async runSchemaBootstrapTransaction(sql: string): Promise<void> {
    const client = await this.acquireClient();

    try {
      await client.query('BEGIN');
      await client.query(`SET LOCAL lock_timeout = '10s'`);
      await client.query(`SET LOCAL statement_timeout = '60s'`);
      await client.query(
        'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
        [DatabaseService.SCHEMA_BOOTSTRAP_LOCK_KEY],
      );
      await client.query(sql);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async withRequestTransaction<T>(callback: () => Promise<T>): Promise<T> {
    const requestContext = this.requestContext.requireStore();

    if (requestContext.db_client) {
      return callback();
    }

    const client = await this.acquireClient();

    try {
      await this.initializeRequestSession(client, requestContext);
      this.requestContext.setDatabaseClient(client);

      const result = await callback();
      await client.query('COMMIT');

      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      this.requestContext.setDatabaseClient(undefined);
      client.release();
    }
  }

  async withIndependentRequestTransaction<T>(
    callback: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const requestContext = this.requestContext.getStore();
    const client = await this.acquireClient();

    try {
      if (requestContext) {
        await this.initializeRequestSession(client, {
          ...requestContext,
          db_client: undefined,
        });
      } else {
        await client.query('BEGIN');
      }

      const result = await callback(client);
      await client.query('COMMIT');

      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async withClient<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const requestContext = this.requestContext.getStore();
    const existingClient = requestContext?.db_client;

    if (existingClient) {
      return callback(existingClient);
    }

    if (requestContext) {
      return this.executeInScopedRequestSession(requestContext, callback);
    }

    const client = await this.acquireClient();

    try {
      return await callback(client);
    } finally {
      client.release();
    }
  }

  async ping(): Promise<'up'> {
    await this.query('SELECT 1');
    return 'up';
  }

  getPoolMetrics(): {
    total_connections: number;
    idle_connections: number;
    active_connections: number;
    waiting_requests: number;
  } {
    const totalConnections = this.pool.totalCount;
    const idleConnections = this.pool.idleCount;
    const waitingRequests = this.pool.waitingCount;

    return {
      total_connections: totalConnections,
      idle_connections: idleConnections,
      active_connections: Math.max(0, totalConnections - idleConnections),
      waiting_requests: waitingRequests,
    };
  }

  private async executeInScopedRequestSession<T>(
    context: RequestContextState,
    callback: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const previousClient = context.db_client;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const client = await this.acquireClient();

      try {
        await this.initializeRequestSession(client, context);
        this.requestContext.setDatabaseClient(client);

        const result = await callback(client);
        await client.query('COMMIT');

        return result;
      } catch (error) {
        await this.rollbackClient(client);

        if (attempt === 0 && this.isStaleDatabaseCacheError(error)) {
          this.logger.warn('Retrying request database session after stale PostgreSQL function cache error');
          continue;
        }

        throw error;
      } finally {
        this.requestContext.setDatabaseClient(previousClient);
        client.release();
      }
    }

    throw new Error('Request database session retry exhausted');
  }

  private async rollbackClient(client: PoolClient): Promise<void> {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      const message = rollbackError instanceof Error ? rollbackError.message : String(rollbackError);
      this.logger.warn(`Failed to roll back request database session: ${message}`);
    }
  }

  private isStaleDatabaseCacheError(error: unknown): boolean {
    const pgError = error as { code?: string; message?: string };
    return pgError.code === 'XX000' && /cache lookup failed for function/i.test(pgError.message ?? '');
  }

  private isSafePublicReadOnlyRequestQuery(
    context: RequestContextState,
    sql: string,
  ): boolean {
    if (context.tenant_id || context.is_authenticated) {
      return false;
    }

    const method = (context.method ?? '').toUpperCase();
    if (method !== 'GET' && method !== 'HEAD') {
      return false;
    }

    return READ_ONLY_SQL_PATTERN.test(sql) && !MUTATING_SQL_PATTERN.test(sql);
  }

  private async executeObservedQuery<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values: unknown[],
    callback: () => Promise<QueryResult<T>>,
  ): Promise<QueryResult<T>> {
    const startedAt = performance.now();
    const statementType = extractStatementType(text);
    const queryFingerprint = createQueryFingerprint(text);

    try {
      const result = await callback();
      const durationMs = performance.now() - startedAt;
      const shouldLogSuccess = !this.isInternalSeedRequest();

      this.getSloMetricsService()?.recordDatabaseQuery({
        outcome: 'success',
        duration_ms: durationMs,
        statement_type: statementType,
        query_fingerprint: queryFingerprint,
        row_count: result.rowCount ?? result.rows.length,
      });
      if (shouldLogSuccess) {
        this.getStructuredLoggerService()?.logEvent(
          'db.query.completed',
          {
            db_statement_type: statementType,
            db_query_fingerprint: queryFingerprint,
            duration_ms: Number(durationMs.toFixed(2)),
            parameter_count: values.length,
            row_count: result.rowCount ?? result.rows.length,
          },
          'debug',
        );
      }
      this.recordPoolWaitingClients();
      this.recordQueryTimeoutBudget(statementType, queryFingerprint, durationMs);

      return result;
    } catch (error) {
      const durationMs = performance.now() - startedAt;
      const message = error instanceof Error ? error.message : String(error);

      this.getSloMetricsService()?.recordDatabaseQuery({
        outcome: 'failure',
        duration_ms: durationMs,
        statement_type: statementType,
        query_fingerprint: queryFingerprint,
        error_message: message,
      });
      this.getStructuredLoggerService()?.logEvent(
        'db.query.failed',
        {
          db_statement_type: statementType,
          db_query_fingerprint: queryFingerprint,
          duration_ms: Number(durationMs.toFixed(2)),
          parameter_count: values.length,
          error_message: message,
        },
        'error',
        error instanceof Error ? error.stack : undefined,
      );
      this.recordPoolWaitingClients();
      this.recordQueryTimeoutBudget(statementType, queryFingerprint, durationMs);

      throw error;
    }
  }

  private recordPoolWaitingClients(): void {
    const waitingClients = this.pool.waitingCount;

    if (waitingClients <= 0) {
      return;
    }

    this.getStructuredLoggerService()?.logEvent(
      'database.pool.waiting_clients',
      {
        waiting_clients: waitingClients,
        ...this.getPoolMetrics(),
      },
      'warn',
    );
  }

  private recordQueryTimeoutBudget(
    statementType: string,
    queryFingerprint: string,
    durationMs: number,
  ): void {
    const statementTimeoutMs = Number(
      this.moduleRef
        .get(ConfigService, { strict: false })
        ?.get<number>('database.statementTimeoutMs') ?? 5000,
    );

    if (durationMs < statementTimeoutMs) {
      return;
    }

    this.getStructuredLoggerService()?.logEvent(
      'database.query.timeout',
      {
        db_statement_type: statementType,
        db_query_fingerprint: queryFingerprint,
        duration_ms: Number(durationMs.toFixed(2)),
        statementTimeoutMs,
      },
      'warn',
    );
  }

  private getStructuredLoggerService(): StructuredLoggerService | undefined {
    if (this.structuredLoggerRef === undefined) {
      try {
        this.structuredLoggerRef =
          this.moduleRef.get(StructuredLoggerService, { strict: false }) ?? null;
      } catch {
        this.structuredLoggerRef = null;
      }
    }

    return this.structuredLoggerRef ?? undefined;
  }

  private getSloMetricsService(): SloMetricsService | undefined {
    if (this.sloMetricsRef === undefined) {
      try {
        this.sloMetricsRef = this.moduleRef.get(SloMetricsService, { strict: false }) ?? null;
      } catch {
        this.sloMetricsRef = null;
      }
    }

    return this.sloMetricsRef ?? undefined;
  }

  private getConnectMaxRetries(): number {
    return Number(
      this.moduleRef.get(ConfigService, { strict: false }).get<number>(
        'database.connectMaxRetries',
      ) ?? 10,
    );
  }

  private getConnectRetryDelayMs(): number {
    return Number(
      this.moduleRef.get(ConfigService, { strict: false }).get<number>(
        'database.connectRetryDelayMs',
      ) ?? 2000,
    );
  }

  private isInternalSeedRequest(): boolean {
    return this.requestContext.getStore()?.path === '/internal/seed';
  }
}

const extractStatementType = (sql: string): string => {
  const normalized = sql.replace(/\s+/g, ' ').trim();

  if (normalized.length === 0) {
    return 'UNKNOWN';
  }

  return normalized.split(' ')[0]!.toUpperCase();
};

const READ_ONLY_SQL_PATTERN = /^\s*(SELECT|WITH|SHOW|EXPLAIN)\b/i;
const MUTATING_SQL_PATTERN = /\b(INSERT|UPDATE|DELETE|TRUNCATE|ALTER|DROP|CREATE|MERGE|CALL)\b/i;

const createQueryFingerprint = (sql: string): string => {
  const normalized = sql.replace(/\s+/g, ' ').trim().toLowerCase();

  return createHash('sha1').update(normalized).digest('hex').slice(0, 16);
};
