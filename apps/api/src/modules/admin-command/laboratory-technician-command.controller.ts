import { Controller, Get, Post, Body } from '@nestjs/common';
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

  @Get('chemicals')
  getChemicals() {
    return this.service.getChemicals();
  }

  @Get('apparatus-issue')
  getApparatusIssue() {
    return this.service.getApparatusIssue();
  }

  @Get('lab-timetable')
  getLabTimetable() {
    return this.service.getLabTimetable();
  }

  @Get('safety-incidents')
  getSafetyIncidents() {
    return this.service.getSafetyIncidents();
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
}
