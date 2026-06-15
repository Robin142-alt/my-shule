import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

import { RequestContextService } from '../common/request-context/request-context.service';
import { BillingAccessService } from '../modules/billing/billing-access.service';

@Injectable()
export class BillingFeatureMiddleware implements NestMiddleware {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly billingAccessService: BillingAccessService,
  ) {}

  async use(request: Request, _response: Response, next: NextFunction): Promise<void> {
    try {
      if (this.shouldBypassBillingAccess(request)) {
        next();
        return;
      }

      const requestContext = this.requestContext.requireStore();

      if (!requestContext.tenant_id) {
        next();
        return;
      }

      const billingAccess = await this.billingAccessService.resolveForTenant(
        requestContext.tenant_id,
      );
      this.requestContext.setBillingAccess(billingAccess);

      next();
    } catch (error) {
      next(error as Error);
    }
  }

  private shouldBypassBillingAccess(request: Request): boolean {
    const path = (request.path || request.originalUrl || request.url || '').toLowerCase();

    return path === '/health'
      || path.startsWith('/health/')
      || path === '/auth'
      || path.startsWith('/auth/');
  }
}
