import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

import { RequestContextService } from '../common/request-context/request-context.service';
import { TenantService } from '../tenant/tenant.service';
import { isPaymentIngressCallback } from '../common/request-path.util';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private readonly tenantService: TenantService,
    private readonly requestContext: RequestContextService,
  ) {}

  async use(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      if (this.isGlobalProbeRequest(request) || isPaymentIngressCallback(request.method, request.path)) {
        next();
        return;
      }

      const resolvedTenant = await this.tenantService.resolveTenantContextForRequest(
        request.headers.host,
        request.headers['x-tenant-id'],
        request.headers['x-tenant-signature'],
      );
      const tenantId = resolvedTenant.tenant_id;

      this.requestContext.setTenantId(tenantId);
      this.requestContext.setTenantSource(resolvedTenant.source);

      next();
    } catch (error) {
      next(error as Error);
    }
  }

  private isGlobalProbeRequest(request: Request): boolean {
    const path = (request.path || request.originalUrl || request.url || '').toLowerCase();

    // Legal release metadata contains public document hashes only, never school or user data.
    return path === '/health' || path === '/health/live'
      || (['GET', 'HEAD'].includes(request.method) && path === '/legal/release');
  }

}
