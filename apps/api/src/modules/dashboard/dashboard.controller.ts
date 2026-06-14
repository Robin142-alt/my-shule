import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardLayoutDto } from './dashboard.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RbacGuard } from '../../guards/rbac.guard';
import { RequestContextService } from '../../common/request-context/request-context.service';

@UseGuards(JwtAuthGuard, RbacGuard)
@Controller('dashboard')
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

  @Get('parent/overview')
  async getParentOverview() {
    const store = this.requestContext.requireStore();
    return this.dashboardService.getParentOverview(store.tenant_id!, store.user_id!);
  }

  @Get('parent/academics')
  async getParentAcademics() {
    const store = this.requestContext.requireStore();
    return this.dashboardService.getParentAcademics(store.tenant_id!, store.user_id!);
  }

  @Get('parent/finance')
  async getParentFinance() {
    const store = this.requestContext.requireStore();
    return this.dashboardService.getParentFinance(store.tenant_id!, store.user_id!);
  }

  @Get('parent/communication')
  async getParentCommunication() {
    const store = this.requestContext.requireStore();
    return this.dashboardService.getParentCommunication(store.tenant_id!, store.user_id!);
  }

  @Get('student/overview')
  async getStudentOverview() {
    const store = this.requestContext.requireStore();
    return this.dashboardService.getStudentOverview(store.tenant_id!, store.user_id!);
  }

  @Get('student/academics')
  async getStudentAcademics() {
    const store = this.requestContext.requireStore();
    return this.dashboardService.getStudentAcademics(store.tenant_id!, store.user_id!);
  }

  @Get('student/attendance')
  async getStudentAttendance() {
    const store = this.requestContext.requireStore();
    return this.dashboardService.getStudentAttendance(store.tenant_id!, store.user_id!);
  }
}
