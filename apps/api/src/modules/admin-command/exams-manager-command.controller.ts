import { Controller, Get, Post, Body } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { ExamsManagerCommandService } from './exams-manager-command.service';

@Controller('admin-command/exams-manager')
@RequiresModule('exams')
@Permissions('exams:read')
export class ExamsManagerCommandController {
  constructor(private readonly service: ExamsManagerCommandService) {}

  @Get('overview')
  getOverview() {
    return this.service.getOverview();
  }

  @Get('exam-setup')
  getExamSetup() {
    return this.service.getExamSetup();
  }

  @Get('exam-timetable')
  getExamTimetable() {
    return this.service.getExamTimetable();
  }

  @Get('marks-entry')
  getMarksEntry() {
    return this.service.getMarksEntry();
  }

  @Get('moderation')
  getModeration() {
    return this.service.getModeration();
  }

  @Get('publishing')
  getPublishing() {
    return this.service.getPublishing();
  }

  @Get('report-cards')
  getReportCards() {
    return this.service.getReportCards();
  }

  @Get('analysis')
  getAnalysis() {
    return this.service.getAnalysis();
  }

  @Get('reports')
  getReports() {
    return this.service.getReports();
  }

  @Post('reports/generate')
  @Permissions('exams:write')
  generateReport(@Body() dto: any) {
    return this.service.generateReport(dto);
  }
}
