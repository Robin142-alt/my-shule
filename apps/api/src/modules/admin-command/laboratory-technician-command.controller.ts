import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { LaboratoryTechnicianCommandService } from './laboratory-technician-command.service';

@Controller('admin-command/laboratory-technician')
@RequiresModule('lab_management')
@Permissions('laboratory:read')
export class LaboratoryTechnicianCommandController {
  constructor(private readonly service: LaboratoryTechnicianCommandService) {}

  @Get('overview')
  getOverview() {
    return this.service.getOverview();
  }

  @Get('lab-inventory')
  getLabInventory() {
    return this.service.getLabInventory();
  }

  @Post('lab-inventory')
  @Permissions('laboratory:write')
  createLabInventory(@Body() dto: any) {
    return this.service.recordLaboratoryAction('inventory.created', dto);
  }

  @Get('chemicals')
  getChemicals() {
    return this.service.getChemicals();
  }

  @Post('chemicals')
  @Permissions('laboratory:write')
  createChemical(@Body() dto: any) {
    return this.service.recordLaboratoryAction('chemical.created', dto);
  }

  @Post('chemicals/:id/dispose')
  @Permissions('laboratory:write')
  disposeChemical(@Param('id') id: string, @Body() dto: any) {
    return this.service.recordLaboratoryAction('chemical.disposed', dto, id);
  }

  @Get('apparatus-issue')
  getApparatusIssue() {
    return this.service.getApparatusIssue();
  }

  @Post('apparatus-issue')
  @Permissions('laboratory:write')
  issueApparatus(@Body() dto: any) {
    return this.service.recordLaboratoryAction('apparatus.issued', dto);
  }

  @Post('apparatus-issue/:id/return')
  @Permissions('laboratory:write')
  returnApparatus(@Param('id') id: string, @Body() dto: any) {
    return this.service.recordLaboratoryAction('apparatus.returned', dto, id);
  }

  @Get('lab-timetable')
  getLabTimetable() {
    return this.service.getLabTimetable();
  }

  @Post('lab-timetable')
  @Permissions('laboratory:write')
  createLabTimetable(@Body() dto: any) {
    return this.service.recordLaboratoryAction('timetable.created', dto);
  }

  @Get('safety-incidents')
  getSafetyIncidents() {
    return this.service.getSafetyIncidents();
  }

  @Post('safety-incidents')
  @Permissions('laboratory:write')
  reportSafetyIncident(@Body() dto: any) {
    return this.service.recordLaboratoryAction('safety-incident.reported', dto);
  }

  @Post('safety-incidents/:id/resolve')
  @Permissions('laboratory:write')
  resolveSafetyIncident(@Param('id') id: string, @Body() dto: any) {
    return this.service.recordLaboratoryAction('safety-incident.resolved', dto, id);
  }

  @Get('reports')
  getReports() {
    return this.service.getReports();
  }

  @Post('reports/generate')
  @Permissions('laboratory:write')
  generateReport(@Body() dto: any) {
    return this.service.generateReport(dto);
  }

  @Post('actions')
  @Permissions('laboratory:write')
  recordAction(@Body() dto: any) {
    return this.service.recordLaboratoryAction(
      String(dto?.action || 'workflow.action'),
      dto,
      dto?.entityId ?? dto?.entity_id ?? null,
    );
  }
}
