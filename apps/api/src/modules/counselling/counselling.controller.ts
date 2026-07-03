import { Controller, Get, UnauthorizedException, UseGuards } from '@nestjs/common';

import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RbacGuard } from '../../guards/rbac.guard';
import { CounsellingService } from './counselling.service';

@Controller('counselling')
@UseGuards(JwtAuthGuard, RbacGuard)
export class CounsellingController {
  constructor(
    private readonly counsellingService: CounsellingService,
    private readonly requestContext: RequestContextService,
  ) {}

  private tenantId() {
    const store = this.requestContext.requireStore();
    if (!store.tenant_id) {
      throw new UnauthorizedException('Tenant context is required');
    }
    return store.tenant_id;
  }

  @Get('dashboard')
  @Permissions('counselling:read')
  getDashboard() {
    return this.counsellingService.getDashboard(this.tenantId());
  }

  @Get('overview')
  @Permissions('counselling:read')
  getOverview() {
    return this.counsellingService.getOverview(this.tenantId());
  }

  @Get('referrals')
  @Permissions('counselling:read')
  getReferrals() {
    return this.counsellingService.getReferrals(this.tenantId());
  }

  @Get('cases')
  @Permissions('counselling:read')
  getCases() {
    return this.counsellingService.getCases(this.tenantId());
  }

  @Get('sessions')
  @Permissions('counselling:read')
  getSessions() {
    return this.counsellingService.getSessions(this.tenantId());
  }

  @Get('appointments')
  @Permissions('counselling:read')
  getAppointments() {
    return this.counsellingService.getAppointments(this.tenantId());
  }

  @Get('followups')
  @Permissions('counselling:read')
  getFollowups() {
    return this.counsellingService.getFollowups(this.tenantId());
  }

  @Get('welfare')
  @Permissions('counselling:read')
  getWelfareConcerns() {
    return this.counsellingService.getWelfareConcerns(this.tenantId());
  }

  @Get('group-guidance')
  @Permissions('counselling:read')
  getGroupGuidance() {
    return this.counsellingService.getGroupGuidance(this.tenantId());
  }

  @Get('parents')
  @Permissions('counselling:read')
  getParents() {
    return this.counsellingService.getParents(this.tenantId());
  }

  @Get('teachers')
  @Permissions('counselling:read')
  getTeachers() {
    return this.counsellingService.getTeachers(this.tenantId());
  }

  @Get('discipline')
  @Permissions('counselling:read')
  getDiscipline() {
    return this.counsellingService.getDiscipline(this.tenantId());
  }

  @Get('health')
  @Permissions('counselling:read')
  getHealth() {
    return this.counsellingService.getHealth(this.tenantId());
  }

  @Get('escalations')
  @Permissions('counselling:read')
  getEscalations() {
    return this.counsellingService.getEscalations(this.tenantId());
  }

  @Get('reports')
  @Permissions('counselling:read')
  getReports() {
    return this.counsellingService.getReports(this.tenantId());
  }

  @Get('templates')
  @Permissions('counselling:read')
  getTemplates() {
    return this.counsellingService.getTemplates();
  }
}
