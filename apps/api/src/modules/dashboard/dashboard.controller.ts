import { Controller, Get, Query, UseGuards, InternalServerErrorException } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardLayoutDto } from './dashboard.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RbacGuard } from '../../guards/rbac.guard';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';

@UseGuards(JwtAuthGuard, RbacGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly requestContext: RequestContextService,
    private readonly prisma: PrismaService,
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

  @Get('summary')
  async getSummary() {
    const tenantId = this.requestContext.requireStore().tenant_id;
    if (!tenantId) {
      return { students: 0, staff: 0, classes: 0 };
    }

    try {
      const [students, staff, classes] = await Promise.all([
        this.prisma.student.count({ where: { schoolId: tenantId } }).catch(() => 0),
        this.prisma.schoolMembership.count({ where: { schoolId: tenantId } }).catch(() => 0),
        this.prisma.class.count({ where: { schoolId: tenantId } }).catch(() => 0),
      ]);
      return { students, staff, classes };
    } catch (error: any) {
      console.error('getSummary error:', error);
      throw new InternalServerErrorException(error.message || 'Database error occurred');
    }
  }
}
