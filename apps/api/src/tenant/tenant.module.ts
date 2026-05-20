import { Global, Module } from '@nestjs/common';

import { TenantService } from './tenant.service';
import { TenantTrustBoundaryService } from './tenant-trust-boundary.service';

@Global()
@Module({
  providers: [TenantService, TenantTrustBoundaryService],
  exports: [TenantService, TenantTrustBoundaryService],
})
export class TenantModule {}
