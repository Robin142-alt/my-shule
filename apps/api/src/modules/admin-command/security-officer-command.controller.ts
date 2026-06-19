import { Controller, Get, Post, Body } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { SecurityOfficerCommandService } from './security-officer-command.service';

@Controller('admin-command/security-officer')
@RequiresModule('visitor_management')
@Permissions('security:read')
export class SecurityOfficerCommandController {
  constructor(private readonly service: SecurityOfficerCommandService) {}

  @Get('overview')
  getOverview() {
    return this.service.getOverview();
  }

  @Get('visitors')
  getVisitors() {
    return this.service.getVisitors();
  }

  @Post('visitors/check-in')
  @Permissions('security:write')
  checkInVisitor(@Body() dto: any) {
    return this.service.checkInVisitor(dto);
  }

  @Get('gate-register')
  getGateRegister() {
    return this.service.getGateRegister();
  }

  @Get('student-exit-passes')
  getStudentExitPasses() {
    return this.service.getStudentExitPasses();
  }

  @Post('student-exit-passes/flag-unauthorized')
  @Permissions('security:write')
  flagUnauthorizedExit(@Body() dto: any) {
    return this.service.flagUnauthorizedExit(dto);
  }

  @Get('staff-movement')
  getStaffMovement() {
    return this.service.getStaffMovement();
  }

  @Post('staff-movement/departure')
  @Permissions('security:write')
  logStaffDeparture(@Body() dto: any) {
    return this.service.logStaffDeparture(dto);
  }

  @Get('incidents')
  getIncidents() {
    return this.service.getIncidents();
  }

  @Get('reports')
  getReports() {
    return this.service.getReports();
  }

  @Post('reports/generate')
  @Permissions('security:write')
  generateReport(@Body() dto: any) {
    return this.service.generateReport(dto);
  }
}
