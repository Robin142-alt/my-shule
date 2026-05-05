import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

import { RequestContextService } from '../common/request-context/request-context.service';
import { DatabaseService } from '../database/database.service';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class AuthContextMiddleware implements NestMiddleware {
  constructor(
    private readonly authService: AuthService,
    private readonly requestContext: RequestContextService,
    private readonly databaseService: DatabaseService,
  ) {}

  async use(request: Request, _response: Response, next: NextFunction): Promise<void> {
    try {
      const accessToken = this.authService.extractBearerToken(request);

      if (!accessToken) {
        next();
        return;
      }

      const requestContext = this.requestContext.requireStore();

      if (!requestContext.tenant_id) {
        throw new UnauthorizedException('Tenant context is required before authentication');
      }

      const principal = await this.authService.authenticateAccessToken(accessToken, requestContext.tenant_id);

      this.requestContext.setUserId(principal.user_id);
      this.requestContext.setRole(principal.role);
      this.requestContext.setSessionId(principal.session_id);
      this.requestContext.setPermissions(principal.permissions);
      this.requestContext.setAuthenticated(principal.is_authenticated);

      await this.databaseService.synchronizeRequestSession(this.requestContext.requireStore());

      next();
    } catch (error) {
      next(error as Error);
    }
  }
}
