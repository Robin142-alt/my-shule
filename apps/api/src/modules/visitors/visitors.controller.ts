import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { VisitorsService } from './visitors.service';

@Controller('visitors')
@RequiresModule('visitor_management')
export class VisitorsController {
  constructor(private readonly visitorsService: VisitorsService) {}

  @Get('dashboard')
  @Permissions('visitors:read')
  async getDashboard() {
    const logs = await this.visitorsService.listVisitorLogs();
    const appointments = await this.visitorsService.listAppointments();
    const activeLogs = logs.filter(l => l.status === 'active');
    return {
      active_visitors: activeLogs.length,
      today_appointments: appointments.length,
      open_records: activeLogs.length,
      records: activeLogs,
    };
  }

  @Post('appointments')
  @Permissions('visitors:write')
  createAppointment(@Body() dto: any) {
    return this.visitorsService.createAppointment(dto);
  }

  @Get('appointments')
  @Permissions('visitors:read')
  listAppointments() {
    return this.visitorsService.listAppointments();
  }

  @Post('logs')
  @Permissions('visitors:write')
  logVisitor(@Body() dto: any) {
    return this.visitorsService.logVisitor(dto);
  }

  @Get('logs')
  @Permissions('visitors:read')
  listVisitorLogs() {
    return this.visitorsService.listVisitorLogs();
  }

  @Patch('logs/:logId/checkout')
  @Permissions('visitors:write')
  checkOutVisitor(@Param('logId') logId: string) {
    return this.visitorsService.checkOutVisitor(logId);
  }

  @Post('student-exits')
  @Permissions('visitors:write')
  logStudentExit(@Body() dto: any) {
    return this.visitorsService.logStudentExit(dto);
  }

  @Get('student-exits')
  @Permissions('visitors:read')
  listStudentExits() {
    return this.visitorsService.listStudentExits();
  }

  @Patch('student-exits/:exitId/return')
  @Permissions('visitors:write')
  returnStudent(@Param('exitId') exitId: string) {
    return this.visitorsService.returnStudent(exitId);
  }
}
