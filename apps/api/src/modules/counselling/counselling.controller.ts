import { Controller, Get, Post, Patch, Param, Body, UseGuards, Request } from '@nestjs/common';
import { CounsellingService } from './counselling.service';
import { Permissions } from '../../auth/decorators/permissions.decorator';

@Controller('api/counsellor')
export class CounsellingController {
  constructor(private readonly counsellingService: CounsellingService) {}

  @Get('overview')
  @Permissions('counselling:read')
  getOverview() {
    return this.counsellingService.getOverview('tenant-1', 'school-1');
  }

  @Get('referrals')
  @Permissions('counselling:read')
  getReferrals() {
    return [];
  }

  @Get('cases')
  @Permissions('counselling:read')
  getCases() {
    return [];
  }

  @Get('sessions')
  @Permissions('counselling:read')
  getSessions() {
    return [];
  }

  @Get('appointments')
  @Permissions('counselling:read')
  getAppointments() {
    return [];
  }

  @Get('followups')
  @Permissions('counselling:read')
  getFollowups() {
    return [];
  }

  @Get('welfare-concerns')
  @Permissions('counselling:read')
  getWelfareConcerns() {
    return [];
  }

  @Get('reports')
  @Permissions('counselling:read')
  getReports() {
    return [];
  }
}
