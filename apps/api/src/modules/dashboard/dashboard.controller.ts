import { Controller, Get, Query, UseGuards, Param } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardSummaryDto } from './dashboard.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RbacGuard } from '../../guards/rbac.guard';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { Permissions } from '../../auth/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, RbacGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly requestContext: RequestContextService,
  ) {}

  @Get('summary')
  @Permissions('dashboard:read')
  async getSummary(
    @Query('role') role: string,
  ): Promise<DashboardSummaryDto> {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id;
    if (!tenantId) {
      throw new Error('Tenant context required');
    }
    return this.dashboardService.getSummary(tenantId, role || 'admin');
  }

  @Get('parent/dashboard')
  @Permissions('parent:read')
  async getParentDashboard() {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id;
    if (!tenantId) {
      throw new Error('Tenant context required');
    }
    return this.dashboardService.getParentDashboard(tenantId);
  }

  @Get('parent/report-cards/:childId')
  @Permissions('dashboard:parent:read')
  async getParentReportCards(@Param('childId') childId: string) {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id;
    if (!tenantId) {
      throw new Error('Tenant context required');
    }
    return this.dashboardService.getParentReportCards(tenantId, childId);
  }

  @Get('student/dashboard')
  @Permissions('student:read')
  async getStudentDashboard() {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id;
    if (!tenantId) {
      throw new Error('Tenant context required');
    }
    return this.dashboardService.getStudentDashboard(tenantId);
  }

  @Get('parent/fees/:childId')
  @Permissions('parent:read')
  async getParentFees(@Param('childId') childId: string) {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id;
    if (!tenantId) {
      throw new Error('Tenant context required');
    }
    return this.dashboardService.getParentFees(tenantId, childId);
  }

  @Get('parent/receipts/:childId')
  @Permissions('parent:read')
  async getParentReceipts(@Param('childId') childId: string) {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id;
    if (!tenantId) {
      throw new Error('Tenant context required');
    }
    return this.dashboardService.getParentReceipts(tenantId, childId);
  }
}
