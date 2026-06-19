import { Controller, Get, Query } from '@nestjs/common';
import { ParentPortalService } from './parent-portal.service';
import { Permissions } from '../auth/decorators/permissions.decorator';

@Controller('parent')
export class ParentPortalController {
  constructor(private readonly service: ParentPortalService) {}

  @Get('overview')
  @Permissions('portal:read')
  getOverview() {
    return this.service.getOverview();
  }

  @Get('academics')
  @Permissions('portal:read')
  getAcademics() {
    return this.service.getAcademics();
  }

  @Get('finance')
  @Permissions('portal:read')
  getFinance() {
    return this.service.getFinance();
  }

  @Get('communication')
  @Permissions('portal:read')
  getCommunication() {
    return this.service.getCommunication();
  }

  @Get('dashboard')
  @Permissions('portal:read')
  getDashboard(@Query('studentId') studentId?: string) {
    return this.service.getDashboardData(studentId);
  }

  @Get('children')
  @Permissions('portal:read')
  getChildren() {
    return this.service.getChildren();
  }
}

