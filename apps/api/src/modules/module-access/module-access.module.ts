import { Global, Module } from '@nestjs/common';

import { ModuleAccessControllerMarker } from './module-access.module.marker';
import {
  PlatformModuleAccessController,
  SchoolModuleAccessController,
} from './module-access.controller';
import { ModuleAccessGuard } from './module-access.guard';
import { ModuleAccessRepository } from './module-access.repository';
import { ModuleAccessSchemaService } from './module-access-schema.service';
import { ModuleAccessService } from './module-access.service';

@Global()
@Module({
  controllers: [PlatformModuleAccessController, SchoolModuleAccessController],
  providers: [
    ModuleAccessControllerMarker,
    ModuleAccessSchemaService,
    ModuleAccessRepository,
    ModuleAccessService,
    ModuleAccessGuard,
  ],
  exports: [ModuleAccessRepository, ModuleAccessService, ModuleAccessGuard],
})
export class ModuleAccessModule {}
