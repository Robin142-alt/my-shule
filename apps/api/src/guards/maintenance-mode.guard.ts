import { CanActivate, ExecutionContext, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { IS_PUBLIC_KEY, SUPERADMIN_ROLE_OWNER } from '../auth/auth.constants';
import { RequestContextService } from '../common/request-context/request-context.service';
import { PlatformOnboardingService } from '../modules/platform/platform-onboarding.service';

@Injectable()
export class MaintenanceModeGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly requestContext: RequestContextService,
    private readonly platformOnboardingService: PlatformOnboardingService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<Request>();

    if (isPublic || request.method?.toUpperCase() === 'OPTIONS') {
      return true;
    }

    const path = request.path || request.url || '';
    if (
      path.startsWith('/api/platform') ||
      path.startsWith('/platform') ||
      path.includes('/health')
    ) {
      return true;
    }

    const settings = await this.platformOnboardingService.getSettings();
    if (settings?.maintenanceMode) {
      const requestContext = this.requestContext.getStore();
      if (requestContext?.role === SUPERADMIN_ROLE_OWNER) {
        return true;
      }

      const message = settings.maintenanceMessage || 'The system is currently undergoing scheduled maintenance. Please try again later.';
      throw new ServiceUnavailableException(message);
    }

    return true;
  }
}
