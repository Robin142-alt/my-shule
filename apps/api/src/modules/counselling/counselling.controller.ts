import { Controller, Get, Post, Patch, Param, Body, UseGuards, Request } from '@nestjs/common';
import { CounsellingService } from './counselling.service';
import { Permissions } from '../../auth/decorators/permissions.decorator';

@Controller('api/counselling')
export class CounsellingController {
  constructor(private readonly counsellingService: CounsellingService) {}

  @Get('dashboard')
  @Permissions('counselling:read')
  getDashboard() {
    return this.counsellingService.getDashboard('tenant-1', 'school-1');
  }

  @Get('referrals')
  @Permissions('counselling:read')
  getReferrals() {
    return this.counsellingService.getReferrals('school-1');
  }

  @Get('cases')
  @Permissions('counselling:read')
  getCases() {
    return this.counsellingService.getCases('school-1');
  }

  @Get('sessions')
  @Permissions('counselling:read')
  getSessions() {
    return this.counsellingService.getSessions('school-1');
  }

  @Get('appointments')
  @Permissions('counselling:read')
  getAppointments() {
    return this.counsellingService.getAppointments('school-1');
  }

  @Get('followups')
  @Permissions('counselling:read')
  getFollowups() {
    return this.counsellingService.getFollowups('school-1');
  }

  @Get('welfare')
  @Permissions('counselling:read')
  getWelfareConcerns() {
    return this.counsellingService.getWelfareConcerns('school-1');
  }
  
  @Get('group-guidance')
  @Permissions('counselling:read')
  getGroupGuidance() {
    return this.counsellingService.getGroupGuidance('school-1');
  }
  
  @Get('parents')
  @Permissions('counselling:read')
  getParents() {
    return this.counsellingService.getParents('school-1');
  }
  
  @Get('teachers')
  @Permissions('counselling:read')
  getTeachers() {
    return this.counsellingService.getTeachers('school-1');
  }

  @Get('discipline')
  @Permissions('counselling:read')
  getDiscipline() {
    return this.counsellingService.getDiscipline('school-1');
  }

  @Get('health')
  @Permissions('counselling:read')
  getHealth() {
    return this.counsellingService.getHealth('school-1');
  }

  @Get('escalations')
  @Permissions('counselling:read')
  getEscalations() {
    return this.counsellingService.getEscalations('school-1');
  }

  @Get('reports')
  @Permissions('counselling:read')
  getReports() {
    return this.counsellingService.getReports('school-1');
  }

  @Get('templates')
  @Permissions('counselling:read')
  getTemplates() {
    return this.counsellingService.getTemplates();
  }
}
