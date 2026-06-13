import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardLayoutDto } from './dashboard.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RbacGuard } from '../../guards/rbac.guard';
import { RequestContextService } from '../../common/request-context/request-context.service';

import { Permissions } from '../../auth/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, RbacGuard)
@Controller('dashboard')
@Permissions('dashboard:*')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly requestContext: RequestContextService,
  ) {}

  @Get('layout')
  async getDashboardLayout(
    @Query('role') role: string,
  ): Promise<DashboardLayoutDto> {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id;
    if (!tenantId) {
      throw new Error('Tenant context required');
    }
    
    // Pass the capabilities to dynamically resolve locked/active buttons and widgets
    return this.dashboardService.getDashboardLayout(
      tenantId, 
      role || store.role || 'user',
      store.permissions
    );
  }
}
