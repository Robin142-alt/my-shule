import { CallHandler, ExecutionContext, HttpException, Injectable, NestInterceptor, UnauthorizedException } from '@nestjs/common';
import { SSE_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { concatMap } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import { LegalService } from './legal.service';

@Injectable()
export class LegalStreamInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector, private readonly legal: LegalService, private readonly auth: AuthService) {}
  intercept(context: ExecutionContext, next: CallHandler) {
    if (!this.reflector.get<boolean>(SSE_METADATA, context.getHandler())) return next.handle();
    const captured = { ...this.legal.context.requireStore(), db_client: undefined };
    const token = this.auth.extractBearerToken(context.switchToHttp().getRequest());
    return next.handle().pipe(concatMap((message) => this.legal.context.run(captured, async () => {
      if (!token || !captured.audience) throw new UnauthorizedException();
      await this.auth.authenticateAccessToken(token, captured.audience === 'superadmin' ? null : captured.tenant_id, captured.audience);
      if (!(await this.legal.status(false)).ready) throw new HttpException('Review your agreements before reconnecting.', 428);
      return message;
    })));
  }
}
