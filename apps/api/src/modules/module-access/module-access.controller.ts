import { Body, Controller, Get, Param, Patch, Post, Put } from '@nestjs/common';

import { Permissions } from '../../auth/decorators/permissions.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { SUPERADMIN_ROLE_OWNER } from '../../auth/auth.constants';
import {
  CloneModulePackageDto,
  CreateModulePackageDto,
  SetSchoolModulesDto,
  ToggleSchoolModuleDto,
  UpsertModuleRegistryDto,
} from './dto/module-access.dto';
import { ModuleAccessService } from './module-access.service';

@Controller('platform')
@Roles(SUPERADMIN_ROLE_OWNER)
export class PlatformModuleAccessController {
  constructor(private readonly moduleAccessService: ModuleAccessService) {}

  @Get('modules')
  listModules() {
    return this.moduleAccessService.listRegistry();
  }

  @Post('modules')
  upsertModule(@Body() dto: UpsertModuleRegistryDto) {
    return this.moduleAccessService.upsertRegistry(dto);
  }

  @Get('module-packages')
  listModulePackages() {
    return this.moduleAccessService.listModulePackages();
  }

  @Post('module-packages')
  createModulePackage(@Body() dto: CreateModulePackageDto) {
    return this.moduleAccessService.createModulePackage(dto);
  }

  @Post('module-packages/:packageId/clone')
  cloneModulePackage(
    @Param('packageId') packageId: string,
    @Body() dto: CloneModulePackageDto,
  ) {
    return this.moduleAccessService.cloneModulePackage(packageId, dto);
  }

  @Get('schools/:tenantId/modules')
  listSchoolModules(@Param('tenantId') tenantId: string) {
    return this.moduleAccessService.listSchoolModules(tenantId);
  }

  @Put('schools/:tenantId/modules')
  setSchoolModules(
    @Param('tenantId') tenantId: string,
    @Body() dto: SetSchoolModulesDto,
  ) {
    return this.moduleAccessService.setSchoolModules(tenantId, dto);
  }

  @Patch('schools/:tenantId/modules/:moduleCode')
  toggleSchoolModule(
    @Param('tenantId') tenantId: string,
    @Param('moduleCode') moduleCode: string,
    @Body() dto: ToggleSchoolModuleDto,
  ) {
    return this.moduleAccessService.toggleSchoolModule(tenantId, moduleCode, dto);
  }
}

@Controller('school/modules')
export class SchoolModuleAccessController {
  constructor(private readonly moduleAccessService: ModuleAccessService) {}

  @Get('me')
  @Permissions('auth:read')
  listCurrentTenantModules() {
    return this.moduleAccessService.listCurrentTenantModules();
  }
}
