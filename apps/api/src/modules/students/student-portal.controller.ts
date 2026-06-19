import { Controller, Get, UseGuards } from '@nestjs/common';
import { StudentPortalService } from './student-portal.service';
import { Permissions } from '../../auth/decorators/permissions.decorator';

@Controller('student')
export class StudentController {
  constructor(private readonly studentPortalService: StudentPortalService) {}

  @Get('dashboard')
  @Permissions('student-portal:read')
  getStudentDashboard() {
    return this.studentPortalService.getDashboard();
  }

  @Get('overview')
  @Permissions('student-portal:read')
  getStudentOverview() {
    return this.studentPortalService.getOverview();
  }

  @Get('academics')
  @Permissions('student-portal:read')
  getStudentAcademics() {
    return this.studentPortalService.getAcademics();
  }

  @Get('attendance')
  @Permissions('student-portal:read')
  getStudentAttendance() {
    return this.studentPortalService.getAttendance();
  }
}
