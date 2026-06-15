import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

import type { BillingAccessContextState } from '../common/request-context/request-context.types';
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

      const billingAccess = await this.resolveBillingAccess(requestContext.tenant_id);
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

  private async resolveBillingAccess(tenantId: string): Promise<BillingAccessContextState> {
    try {
      return await this.billingAccessService.resolveForTenant(tenantId);
    } catch {
      return {
        subscription_id: null,
        plan_code: null,
        status: null,
        lifecycle_state: null,
        access_mode: null,
        features: [],
        limits: {},
        current_period_start: null,
        current_period_end: null,
        warning_starts_at: null,
        grace_period_ends_at: null,
        restricted_at: null,
        suspended_at: null,
        suspension_reason: null,
        renewal_required: false,
        is_active: false,
      };
    }
  }
}
