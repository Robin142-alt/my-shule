import { CanActivate, ExecutionContext, HttpException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../auth/auth.constants';
import { ALLOW_PENDING_LEGAL } from './legal-access.decorator';
import { LegalService } from './legal.service';

@Injectable()
export class LegalGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly legal: LegalService) {}
  async canActivate(context: ExecutionContext) {
    const targets = [context.getHandler(), context.getClass()];
    if (context.switchToHttp().getRequest().method === 'OPTIONS' || this.reflector.getAllAndOverride(IS_PUBLIC_KEY, targets) || this.reflector.getAllAndOverride(ALLOW_PENDING_LEGAL, targets)) return true;
    const status = await this.legal.status(false);
    if (!status.ready) throw new HttpException('Review the required agreements at /legal/accept before continuing.', 428);
    return true;
  }
}
