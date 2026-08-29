import { Body, Controller, Get, Post } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { DeanAcademicsCommandService } from './dean-academics-command.service';

@Controller('admin-command/dean-academics')
@RequiresModule('academics')
@Permissions('academics:read')
export class DeanAcademicsCommandController {
  constructor(private readonly service: DeanAcademicsCommandService) {}

  @Get('overview')
  getOverview() {
    return this.service.getOverview();
  }

  @Get('teacher-workload')
  getTeacherWorkload() {
    return this.service.getTeacherWorkload();
  }

  @Get('lesson-plans')
  getLessonPlans() {
    return this.service.getLessonPlans();
  }

  @Get('lesson-logs')
  getLessonLogs() {
    return this.service.getLessonLogs();
  }

  @Get('curriculum-coverage')
  getCurriculumCoverage() {
    return this.service.getCurriculumCoverage();
  }

  @Get('assessments')
  getAssessments() {
    return this.service.getAssessments();
  }

  @Get('academic-interventions')
  getAcademicInterventions() {
    return this.service.getAcademicInterventions();
  }

  @Get('department-performance')
  getDepartmentPerformance() {
    return this.service.getDepartmentPerformance();
  }

  @Get('reports')
  getReports() {
    return this.service.getReports();
  }

  @Post('reports/generate')
  @Permissions('academics:write')
  generateReport(@Body() dto: any) {
    return this.service.generateReport(dto);
  }

  @Post('lock-batch')
  @RequiresModule('exams')
  @Permissions('exams:approve')
  lockBatch(@Body() dto: any) {
    return this.service.lockAssessmentBatch(dto);
  }

  @Post('action')
  @Permissions('academics:write')
  recordAction(@Body() dto: any) {
    return this.service.recordDeanAction(dto?.action ?? 'dean_action', dto);
  }
}
