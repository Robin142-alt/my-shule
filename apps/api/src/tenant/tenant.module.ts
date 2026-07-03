import { Global, Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { TenantSchemaService } from './tenant-schema.service';
import { TenantService } from './tenant.service';
import { TenantTrustBoundaryService } from './tenant-trust-boundary.service';

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [TenantSchemaService, TenantService, TenantTrustBoundaryService],
  exports: [TenantService, TenantTrustBoundaryService],
})
export class TenantModule {}
