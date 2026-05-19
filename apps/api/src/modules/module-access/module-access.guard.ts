import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { RequestContextService } from '../../common/request-context/request-context.service';
import { ModuleCode } from './module-access.constants';
import { MODULE_ACCESS_KEY } from './module-access.decorator';
import { ModuleAccessService } from './module-access.service';

@Injectable()
export class ModuleAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly requestContext: RequestContextService,
    private readonly moduleAccessService: ModuleAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredModules = this.reflector.getAllAndOverride<ModuleCode[]>(MODULE_ACCESS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredModules || requiredModules.length === 0) {
      return true;
    }

    const requestContext = this.requestContext.requireStore();

    if (!requestContext.tenant_id) {
      throw new ForbiddenException('Tenant context is required for module access checks');
    }

    const missingModule = await this.moduleAccessService.findFirstMissingModule(
      requestContext.tenant_id,
      requiredModules,
    );

    if (missingModule) {
      throw new ForbiddenException('Module not enabled for your school');
    }

    return true;
  }
}
