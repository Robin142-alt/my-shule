import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';

import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import {
  BulkExamMarkUploadDto,
  CorrectLockedExamMarkDto,
  CreateExamAssessmentDto,
  CreateExamSeriesDto,
  EnterExamMarkDto,
  GenerateReportCardBatchDto,
  GenerateReportCardDto,
  LockExamMarksDto,
  ModerateExamMarksDto,
  PublishReportCardDto,
  CreateTimetableSlotDto,
  AssignInvigilatorDto,
  MarkExamAttendanceDto,
  ReportStudentExamCaseDto,
} from './dto/exams.dto';
import { ExamsService } from './exams.service';

@Controller('exams')
@RequiresModule('exams')
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Get('dashboard')
  @Permissions('exams:read')
  getDashboard() {
    return this.examsService.getDashboard();
  }

  @Post('series')
  @Permissions('exams:write')
  createSeries(@Body() dto: CreateExamSeriesDto) {
    return this.examsService.createSeries(dto);
  }

  @Post('assessments')
  @Permissions('exams:write')
  createAssessment(@Body() dto: CreateExamAssessmentDto) {
    return this.examsService.createAssessment(dto);
  }

  @Post('marks')
  @Permissions('exams:enter-marks')
  enterMark(@Body() dto: EnterExamMarkDto) {
    return this.examsService.enterMark(dto);
  }

  @Get('marks/bulk-template')
  @Permissions('exams:enter-marks')
  getBulkMarkUploadTemplate() {
    return this.examsService.getBulkMarkUploadTemplate();
  }

  @Post('marks/bulk-upload')
  @Permissions('exams:enter-marks')
  bulkUploadMarks(@Body() dto: BulkExamMarkUploadDto) {
    return this.examsService.bulkUploadMarks(dto);
  }

  @Patch('marks/corrections')
  @Permissions('exams:approve')
  correctLockedMark(@Body() dto: CorrectLockedExamMarkDto) {
    return this.examsService.correctLockedMark(dto);
  }

  @Post('configuration')
  @Permissions('exams:write')
  configureExam(@Body() dto: any) {
    return this.examsService.createSeries({
      academic_term_id: dto.termId || dto.academic_term_id,
      name: dto.examName || dto.name,
      starts_on: dto.starts_on || new Date().toISOString().split('T')[0],
      ends_on: dto.ends_on || new Date().toISOString().split('T')[0],
    });
  }

  @Post('draft')
  @Permissions('exams:write')
  saveDraft(@Body() dto: any) {
    return this.examsService.saveDraft(dto);
  }

  @Post('alignment')
  @Permissions('exams:write')
  alignExam(@Body() dto: any) {
    return this.examsService.alignExam(dto);
  }

  @Post('review')
  @Permissions('exams:approve')
  reviewExam(@Body() dto: any) {
    return this.examsService.reviewExam(dto);
  }

  @Post('lifecycle')
  @Permissions('exams:write')
  updateLifecycle(@Body() dto: any) {
    return this.examsService.updateLifecycle(dto);
  }

  @Post('report-cards/publish')
  @Permissions('exams:approve')
  publishReportCard(@Body() dto: PublishReportCardDto) {
    return this.examsService.publishReportCard(dto);
  }

  @Post('report-cards/generate')
  @Permissions('exams:approve')
  generateReportCard(@Body() dto: GenerateReportCardDto) {
    return this.examsService.generateReportCard(dto);
  }

  @Post('report-cards/regenerate')
  @Permissions('exams:approve')
  regenerateReportCard(@Body() dto: GenerateReportCardDto & { reason?: string }) {
    return this.examsService.regenerateReportCard(dto);
  }

  @Post('report-cards/batches')
  @Permissions('exams:approve')
  generateReportCardBatch(@Body() dto: GenerateReportCardBatchDto) {
    return this.examsService.generateReportCardBatch(dto);
  }

  @Get('report-cards/batches/:batchId')
  @Permissions('exams:read')
  getReportCardBatchStatus(@Param('batchId') batchId: string) {
    return this.examsService.getReportCardBatchStatus(batchId);
  }

  @Get('report-cards/verify/:verificationCode')
  @Permissions('exams:read')
  verifyReportCard(@Param('verificationCode') verificationCode: string) {
    return this.examsService.verifyReportCard(verificationCode);
  }

  @Get('report-cards')
  @Permissions('exams:read')
  listReportCards(@Query() query: Record<string, string | undefined>) {
    return this.examsService.listReportCards(query);
  }

  @Get('report-cards/:reportCardId/parent-download')
  @Permissions('portal:read_own_children')
  createParentReportCardDownload(@Param('reportCardId') reportCardId: string) {
    return this.examsService.createParentReportCardDownload(reportCardId);
  }

  @Get('report-cards/download/:token')
  @Permissions('portal:read_own_children')
  downloadParentReportCard(@Param('token') token: string) {
    return this.examsService.readParentReportCardDownloadToken(token);
  }

  @Get('mark-sheets')
  @Permissions('exams:read')
  listMarkSheets(@Query() query: Record<string, string | undefined>) {
    return this.examsService.listMarkSheets(query);
  }

  @Patch('mark-sheets/:markSheetId/lock')
  @Permissions('exams:enter-marks')
  lockMarkSheet(@Param('markSheetId') markSheetId: string) {
    return this.examsService.lockMarkSheet(markSheetId);
  }

  @Get('marks/department')
  @Permissions('exams:approve')
  getDepartmentMarks(@Query() query: Record<string, string | undefined>) {
    return this.examsService.getDepartmentMarks(query);
  }

  @Post('marks/moderate')
  @Permissions('exams:approve')
  moderateMarks(@Body() dto: ModerateExamMarksDto) {
    return this.examsService.moderateMarks(dto);
  }

  @Get('marks/school')
  @Permissions('exams:read')
  getSchoolMarks(@Query() query: Record<string, string | undefined>) {
    return this.examsService.getSchoolMarks(query);
  }

  @Post('marks/lock')
  @Permissions('exams:write')
  lockMarks(@Body() dto: LockExamMarksDto) {
    return this.examsService.lockMarks(dto);
  }

  @Post('series/:id/publish')
  @Permissions('exams:write')
  publishExamSeries(@Param('id') id: string) {
    return this.examsService.publishExamSeries(id);
  }

  @Post('timetable-slots')
  @Permissions('exams:write')
  createTimetableSlot(@Body() dto: CreateTimetableSlotDto) {
    return this.examsService.createTimetableSlot(dto);
  }

  @Post('invigilators')
  @Permissions('exams:write')
  assignInvigilator(@Body() dto: AssignInvigilatorDto) {
    return this.examsService.assignInvigilator(dto);
  }

  @Post('attendance')
  @Permissions('exams:write')
  markAttendance(@Body() dto: MarkExamAttendanceDto) {
    return this.examsService.markAttendance(dto);
  }

  @Post('student-cases')
  @Permissions('exams:write')
  reportStudentCase(@Body() dto: ReportStudentExamCaseDto) {
    return this.examsService.reportStudentCase(dto);
  }
  @Get('timetable-slots')
  @Permissions('exams:read')
  getTimetableSlots(@Query() query: Record<string, string | undefined>) {
    return this.examsService.getTimetableSlots(query);
  }

  @Get('invigilators')
  @Permissions('exams:read')
  getInvigilators(@Query() query: Record<string, string | undefined>) {
    return this.examsService.getInvigilators(query);
  }

  @Get('attendance')
  @Permissions('exams:read')
  getAttendance(@Query() query: Record<string, string | undefined>) {
    return this.examsService.getAttendance(query);
  }

  @Get('student-cases')
  @Permissions('exams:read')
  getStudentCases(@Query() query: Record<string, string | undefined>) {
    return this.examsService.getStudentCases(query);
  }

  @Get('series')
  @Permissions('exams:read')
  getExamSeries(@Query() query: Record<string, string | undefined>) {
    return this.examsService.getExamSeries(query);
  }

  @Get('series/:id/readiness')
  @Permissions('exams:read')
  getExamReadiness(@Param('id') id: string) {
    return this.examsService.getExamReadiness(id);
  }

  @Get('assessments')
  @Permissions('exams:read')
  getExamAssessments(@Query() query: Record<string, string | undefined>) {
    return this.examsService.getExamAssessments(query);
  }

  @Get('grading-policies')
  @Permissions('exams:read')
  getGradingPolicies(@Query() query: Record<string, string | undefined>) {
    return this.examsService.getGradingPolicies(query);
  }

  @Get('audit-logs')
  @Permissions('exams:read')
  getAuditLogs(@Query() query: Record<string, string | undefined>) {
    return this.examsService.getAuditLogs(query);
  }

  @Get('subject-weightings')
  @Permissions('exams:read')
  getSubjectWeightings(@Query() query: Record<string, string | undefined>) {
    return this.examsService.getSubjectWeightings(query);
  }

  @Get('assessment-components')
  @Permissions('exams:read')
  getAssessmentComponents(@Query() query: Record<string, string | undefined>) {
    return this.examsService.getAssessmentComponents(query);
  }

  @Get('mark-entry-windows')
  @Permissions('exams:read')
  getMarkEntryWindows(@Query() query: Record<string, string | undefined>) {
    return this.examsService.getMarkEntryWindows(query);
  }

  @Get('marks')
  @Permissions('exams:read')
  getMarks(@Query() query: Record<string, string | undefined>) {
    return this.examsService.getMarks(query);
  }

  @Get('mark-versions')
  @Permissions('exams:read')
  getMarkVersions(@Query() query: Record<string, string | undefined>) {
    return this.examsService.getMarkVersions(query);
  }

  @Get('report-card-batches')
  @Permissions('exams:read')
  getReportCardBatches(@Query() query: Record<string, string | undefined>) {
    return this.examsService.getReportCardBatches(query);
  }

  @Get('report-cards')
  @Permissions('exams:read')
  getReportCards(@Query() query: Record<string, string | undefined>) {
    return this.examsService.getReportCards(query);
  }

  @Get('dashboard-stats')
  @Permissions('exams:read')
  getExamDashboardStats() {
    return this.examsService.getExamDashboardStats();
  }


  @Get('configuration')
  @Permissions('exams:read')
  getConfiguration() {
    return this.examsService.getConfiguration();
  }

  @Get('draft')
  @Permissions('exams:read')
  getDrafts() {
    return this.examsService.getDrafts();
  }

  @Get('alignment')
  @Permissions('exams:read')
  getAlignment() {
    return this.examsService.getAlignment();
  }

  @Get('review')
  @Permissions('exams:read')
  getReview() {
    return this.examsService.getReview();
  }

  @Get('lifecycle')
  @Permissions('exams:read')
  getLifecycle() {
    return this.examsService.getLifecycle();
  }
}
