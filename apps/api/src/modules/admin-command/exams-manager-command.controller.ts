import { Body, Controller, Get, Param, Post } from '@nestjs/common';
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

  @Get('options')
  getExamSetupOptions() {
    return this.service.getExamSetupOptions();
  }

  @Post('exam-setup')
  @Permissions('exams:write')
  createExamSetup(@Body() dto: any) {
    return this.service.createExamSetup(dto);
  }

  @Post('exam-setup/:id/configure')
  @Permissions('exams:write')
  configureExamSetup(@Param('id') id: string, @Body() dto: any) {
    return this.service.configureExamSetup(id, dto);
  }

  @Get('exam-timetable')
  getExamTimetable() {
    return this.service.getExamTimetable();
  }

  @Post('exam-timetable')
  @Permissions('exams:write')
  createExamTimetable(@Body() dto: any) {
    return this.service.createExamTimetableSlot(dto);
  }

  @Get('marks-entry')
  getMarksEntry() {
    return this.service.getMarksEntry();
  }

  @Get('teacher-mark-progress')
  @Permissions('exams:write')
  getTeacherMarkProgress() {
    return this.service.getTeacherMarkProgress();
  }

  @Post('marks-entry')
  @Permissions('exams:write')
  submitMarks(@Body() dto: any) {
    return this.service.recordExamAction('marks-entry.submitted', dto);
  }

  @Post('import-marks')
  @Permissions('exams:write')
  importMarks(@Body() dto: any) {
    return this.service.recordExamAction('marks.imported', dto);
  }

  @Post('export-marks')
  @Permissions('exams:write')
  exportMarks(@Body() dto: any) {
    return this.service.recordExamAction('marks.exported', dto);
  }

  @Post('zeraki-sync')
  @Permissions('exams:write')
  syncZeraki(@Body() dto: any) {
    return this.service.requestZerakiSync(dto);
  }

  @Post('action')
  @Permissions('exams:write')
  recordAction(@Body() dto: any) {
    return this.service.recordExamAction(dto?.action ?? 'exams.action', dto);
  }

  @Post('marks-entry/:id/lock')
  @Permissions('exams:write')
  lockMarks(@Param('id') id: string, @Body() dto: any) {
    return this.service.lockMarksEntry(id, dto);
  }

  @Get('moderation')
  getModeration() {
    return this.service.getModeration();
  }

  @Post('moderation/:id/approve')
  @Permissions('exams:write')
  approveModeration(@Param('id') id: string, @Body() dto: any) {
    return this.service.approveModeration(id, dto);
  }

  @Post('moderation/:id/reject')
  @Permissions('exams:write')
  rejectModeration(@Param('id') id: string, @Body() dto: any) {
    return this.service.rejectModeration(id, dto);
  }

  @Get('publishing')
  getPublishing() {
    return this.service.getPublishing();
  }

  @Post('publishing/:id/publish')
  @Permissions('exams:publish')
  publishResults(@Param('id') id: string, @Body() dto: any) {
    return this.service.publishResults(id, dto);
  }

  @Post('publishing/:id/unpublish')
  @Permissions('exams:publish')
  unpublishResults(@Param('id') id: string, @Body() dto: any) {
    return this.service.unpublishResults(id, dto);
  }

  @Get('report-cards')
  getReportCards() {
    return this.service.getReportCards();
  }

  @Post('report-cards/:id/generate')
  @Permissions('exams:write')
  generateReportCard(@Param('id') id: string, @Body() dto: any) {
    return this.service.generateReportCards(id, dto);
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
