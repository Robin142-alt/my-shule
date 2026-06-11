import { Controller, Get } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { DeputyCommandService } from './deputy-command.service';

@Controller('admin-command/deputy')
export class DeputyCommandController {
  constructor(private readonly deputyService: DeputyCommandService) {}

  @Get('overview')
  @Permissions('deputy:read')
  getOverview() { return this.deputyService.getOverview(); }

  @Get('daily-operations')
  @Permissions('deputy:read')
  getDailyOperations() { return this.deputyService.getDailyOperations(); }

  @Get('attendance')
  @Permissions('deputy:read')
  getAttendance() { return this.deputyService.getAttendance(); }

  @Get('discipline')
  @Permissions('deputy:read')
  getDiscipline() { return this.deputyService.getDiscipline(); }

  @Get('welfare')
  @Permissions('deputy:read')
  getWelfare() { return this.deputyService.getWelfare(); }

  @Get('staff-duty')
  @Permissions('deputy:read')
  getStaffDuty() { return this.deputyService.getStaffDuty(); }

  @Get('timetable')
  @Permissions('deputy:read')
  getTimetable() { return this.deputyService.getTimetable(); }

  @Get('academics')
  @Permissions('deputy:read')
  getAcademics() { return this.deputyService.getAcademics(); }

  @Get('exams')
  @Permissions('deputy:read')
  getExams() { return this.deputyService.getExams(); }

  @Get('classes')
  @Permissions('deputy:read')
  getClasses() { return this.deputyService.getClasses(); }

  @Get('approvals')
  @Permissions('deputy:read')
  getApprovals() { return this.deputyService.getApprovals(); }

  @Get('communication')
  @Permissions('deputy:read')
  getCommunication() { return this.deputyService.getCommunication(); }

  @Get('reports')
  @Permissions('deputy:read')
  getReports() { return this.deputyService.getReports(); }

  @Get('staff')
  @Permissions('deputy:read')
  getStaff() { return this.deputyService.getStaff(); }
}
