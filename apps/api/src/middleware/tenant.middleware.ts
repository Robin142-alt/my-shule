import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import type { PoolClient } from 'pg';

import { RequestContextService } from '../common/request-context/request-context.service';
import { DatabaseService } from '../database/database.service';
import { TenantService } from '../tenant/tenant.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantMiddleware.name);

  constructor(
    private readonly tenantService: TenantService,
    private readonly requestContext: RequestContextService,
    private readonly databaseService: DatabaseService,
  ) {}

  async use(request: Request, response: Response, next: NextFunction): Promise<void> {
    let client: PoolClient | null = null;

    try {
      if (this.isHealthProbeRequest(request)) {
        next();
        return;
      }

      const requestContext = this.requestContext.requireStore();
      const resolvedTenant = await this.tenantService.resolveTenantContextForRequest(
        request.headers.host,
        request.headers['x-tenant-id'],
        request.headers['x-tenant-signature'],
      );
      const tenantId = resolvedTenant.tenant_id;

      this.requestContext.setTenantId(tenantId);
      this.requestContext.setTenantSource(resolvedTenant.source);

      if (this.shouldDeferRequestTransaction(request)) {
        next();
        return;
      }

      client = await this.databaseService.acquireClient();
      await this.databaseService.initializeRequestSession(client, {
        ...requestContext,
        tenant_id: tenantId,
        tenant_source: resolvedTenant.source,
      });

      this.requestContext.setDatabaseClient(client);
      this.bindTransactionLifecycle(response, client);

      next();
    } catch (error) {
      if (client) {
        await this.rollbackAndRelease(client);
      }

      next(error as Error);
    }
  }

  private bindTransactionLifecycle(response: Response, client: PoolClient): void {
    let settled = false;

    const finalize = async (rollback: boolean): Promise<void> => {
      if (settled) {
        return;
      }

      settled = true;
      response.removeListener('finish', onFinish);
      response.removeListener('close', onClose);

      try {
        await client.query(rollback ? 'ROLLBACK' : 'COMMIT');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown transaction error';
        this.logger.error(message);
      } finally {
        this.clearRequestDatabaseClient(client);
        client.release();
      }
    };

    const onFinish = (): void => {
      void finalize(response.statusCode >= 400);
    };

    const onClose = (): void => {
      void finalize(true);
    };

    response.once('finish', onFinish);
    response.once('close', onClose);
  }

  private async rollbackAndRelease(client: PoolClient): Promise<void> {
    try {
      await client.query('ROLLBACK');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown rollback error';
      this.logger.error(message);
    } finally {
      this.clearRequestDatabaseClient(client);
      client.release();
    }
  }

  private clearRequestDatabaseClient(client: PoolClient): void {
    const store = this.requestContext.getStore();

    if (store?.db_client === client) {
      this.requestContext.setDatabaseClient(undefined);
    }
  }

  private shouldDeferRequestTransaction(request: Request): boolean {
    return (
      this.isCorsPreflightRequest(request)
      || this.headerIncludes(request.headers.accept, 'text/event-stream')
      || this.isHealthProbeRequest(request)
    );
  }

  private headerIncludes(value: string | string[] | undefined, expected: string): boolean {
    const values = Array.isArray(value) ? value : [value];

    return values.some((entry) => entry?.toLowerCase().includes(expected));
  }

  private isHealthProbeRequest(request: Request): boolean {
    const path = (request.path || request.originalUrl || request.url || '').toLowerCase();

    return path === '/health' || path.startsWith('/health/');
  }

  private isCorsPreflightRequest(request: Request): boolean {
    return (request.method ?? '').toUpperCase() === 'OPTIONS';
  }
}
