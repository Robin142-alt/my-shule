import { Controller, Get, Post, Body } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { SecretaryCommandService } from './secretary-command.service';

@Controller('admin-command/secretary')
@RequiresModule('visitor_management')
@Permissions('secretary:read')
export class SecretaryCommandController {
  constructor(private readonly service: SecretaryCommandService) {}

  @Get('overview')
  getOverview() {
    return this.service.getOverview();
  }

  @Get('dashboard')
  getDashboard() {
    return this.service.getDashboard();
  }

  @Get('visitors')
  getVisitors() {
    return this.service.getVisitors();
  }

  @Post('visitors/check-in')
  @Permissions('secretary:write')
  checkInVisitor(@Body() dto: any) {
    return this.service.checkInVisitor(dto);
  }

  @Get('appointments')
  getAppointments() {
    return this.service.getAppointments();
  }

  @Get('calls-log')
  getCallsLog() {
    return this.service.getCallsLog();
  }

  @Get('reception-queue')
  getReceptionQueue() {
    return this.service.getReceptionQueue();
  }

  @Get('parent-messages')
  getParentMessages() {
    return this.service.getParentMessages();
  }

  @Get('letters-documents')
  getLettersDocuments() {
    return this.service.getLettersDocuments();
  }

  @Get('student-clearance')
  getStudentClearance() {
    return this.service.getStudentClearance();
  }

  @Get('reports')
  getReports() {
    return this.service.getReports();
  }

  @Post('reports/generate')
  @Permissions('secretary:write')
  generateReport(@Body() dto: any) {
    return this.service.generateReport(dto);
  }
}
