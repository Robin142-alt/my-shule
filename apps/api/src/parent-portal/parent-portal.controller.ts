import { Controller, Get, Post, Param, Body, UseGuards, Req, Query } from '@nestjs/common';
import { ParentPortalService } from './parent-portal.service';
import { Permissions } from '../auth/decorators/permissions.decorator';

@Controller('api/parent')
export class ParentPortalController {
  constructor(private readonly service: ParentPortalService) {}

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

  @Get(':module/:studentId')
  @Permissions('portal:read')
  getModuleData(@Param('module') module: string, @Param('studentId') studentId: string) {
    return this.service.getModuleData(module, studentId);
  }
}
