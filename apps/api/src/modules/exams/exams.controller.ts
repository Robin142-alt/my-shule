import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, StreamableFile, UploadedFile, UseInterceptors } from '@nestjs/common';
import { PdfService } from '../../common/pdf/pdf.service';
import { StreamingUploadInterceptor } from '../../common/uploads/streaming-upload.interceptor';
import type { UploadFileMetadata } from '../../common/uploads/upload-policy';

import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import {
  BulkExamMarkUploadDto,
  AddAcademicInterventionUpdateDto,
  CorrectLockedExamMarkDto,
  CreateAcademicInterventionDto,
  CreateExamAssessmentDto,
  CreateExamSeriesDto,
  EnterExamMarkDto,
  GenerateReportCardBatchDto,
  GenerateReportCardDto,
  RegenerateReportCardDto,
  TransitionReportCardDto,
  UpdateReportCardCommentsDto,
  LockExamMarksDto,
  ModerateExamMarksDto,
  PublishReportCardDto,
  CreateTimetableSlotDto,
  AssignInvigilatorDto,
  MarkExamAttendanceDto,
  ReportStudentExamCaseDto,
  UpdateExamSettingsDto,
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

  @Get('workflow')
  @Permissions('exams:read')
  getWorkflowOverview(@Query() query: Record<string, string | undefined>) {
    return this.examsService.getWorkflowOverview(query);
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

  @Patch('assessments/:assessmentId')
  @Permissions('exams:write')
  updateAssessment(@Param('assessmentId') assessmentId: string, @Body() dto: { name?: string; max_score?: number; weight?: number }) {
    return this.examsService.updateAssessment(assessmentId, dto);
  }

  @Delete('assessments/:assessmentId')
  @Permissions('exams:write')
  deleteAssessment(@Param('assessmentId') assessmentId: string) {
    return this.examsService.deleteAssessment(assessmentId);
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

  @Get('marks/import-batches')
  @Permissions('exams:read')
  getMarkImportBatches(@Query() query: Record<string, string | undefined>) {
    return this.examsService.getMarkImportBatches(query);
  }

  @Get('marks/import-batches/:batchId')
  @Permissions('exams:read')
  getMarkImportBatch(@Param('batchId') batchId: string) {
    return this.examsService.getMarkImportBatch(batchId);
  }

  @Post('marks/import-batches/:batchId/rollback')
  @Permissions('exams:approve')
  rollbackMarkImportBatch(@Param('batchId') batchId: string, @Body() dto: { reason?: string }) {
    return this.examsService.rollbackMarkImportBatch(batchId, dto.reason);
  }

  @Post('marks/submit')
  @Permissions('exams:enter-marks')
  submitMarks(@Body() dto: { mark_ids?: string[] }) {
    return this.examsService.submitMarks(dto.mark_ids);
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
  @Permissions('exams:read')
  publishReportCard(@Body() dto: PublishReportCardDto) {
    return this.examsService.publishReportCard(dto);
  }

  @Get('analytics/subject')
  @Permissions('exams:subject-analytics')
  getSubjectAnalytics(@Query() query: Record<string, string | undefined> = {}) {
    return this.examsService.getAnalytics({ ...query, scope: 'subject' });
  }

  @Get('analytics')
  @Permissions('exams:read')
  getAnalytics(@Query() query: Record<string, string | undefined> = {}) {
    return this.examsService.getAnalytics(query);
  }

  @Get('interventions')
  @Permissions('academics:read')
  listAcademicInterventions(@Query() query: Record<string, string | undefined>) {
    return this.examsService.listAcademicInterventions(query);
  }

  @Post('interventions')
  @Permissions('academics:read')
  createAcademicIntervention(@Body() dto: CreateAcademicInterventionDto) {
    return this.examsService.createAcademicIntervention(dto);
  }

  @Post('interventions/:interventionId/updates')
  @Permissions('academics:read')
  addAcademicInterventionUpdate(
    @Param('interventionId') interventionId: string,
    @Body() dto: AddAcademicInterventionUpdateDto,
  ) {
    return this.examsService.addAcademicInterventionUpdate(interventionId, dto);
  }

  @Post('interventions/:interventionId/notify-hod')
  @Permissions('academics:read')
  notifyAcademicInterventionHod(
    @Param('interventionId') interventionId: string,
    @Body() dto: { message?: string },
  ) {
    return this.examsService.notifyAcademicInterventionHod(interventionId, dto.message);
  }

  @Post('report-cards/generate')
  @Permissions('exams:write')
  generateReportCard(@Body() dto: GenerateReportCardDto) {
    return this.examsService.generateReportCard(dto);
  }

  @Post('report-cards/regenerate')
  @Permissions('exams:write')
  regenerateReportCard(@Body() dto: RegenerateReportCardDto) {
    return this.examsService.regenerateReportCard(dto);
  }

  @Get('report-cards/generation-scopes')
  @Permissions('exams:read')
  listReportCardGenerationScopes() {
    return this.examsService.listReportCardGenerationScopes();
  }

  @Post('report-cards/batches')
  @Permissions('exams:write')
  generateReportCardBatch(@Body() dto: GenerateReportCardBatchDto) {
    return this.examsService.generateReportCardBatch(dto);
  }

  @Get('report-cards/batches/:batchId')
  @Permissions('exams:read')
  getReportCardBatchStatus(@Param('batchId') batchId: string) {
    return this.examsService.getReportCardBatchStatus(batchId);
  }

  @Post('results-processing/:batchId/run')
  @Permissions('exams:write')
  processResultBatch(@Param('batchId') batchId: string, @Body() dto: { mode?: string }) {
    return this.examsService.processResultBatch(batchId, dto.mode);
  }

  @Post('results-processing/:batchId/clear')
  @Permissions('exams:write')
  clearResultProcessing(@Param('batchId') batchId: string) {
    return this.examsService.clearResultProcessing(batchId);
  }

  @Get('results-processing/:batchId/broadsheet')
  @Permissions('exams:read')
  getResultBroadsheet(@Param('batchId') batchId: string) {
    return this.examsService.getResultBroadsheet(batchId);
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

  @Patch('report-cards/:reportCardId/transition')
  @Permissions('exams:read')
  transitionReportCard(
    @Param('reportCardId') reportCardId: string,
    @Body() dto: TransitionReportCardDto,
  ) {
    return this.examsService.transitionReportCard(reportCardId, dto.action, dto.reason);
  }

  @Patch('report-cards/:reportCardId/comments')
  @Permissions('exams:write')
  updateReportCardComments(@Param('reportCardId') reportCardId: string, @Body() dto: UpdateReportCardCommentsDto) {
    return this.examsService.updateReportCardComments(reportCardId, dto.class_teacher_comment, dto.principal_comment);
  }

  @Get('report-cards/:reportCardId/parent-download')
  @Permissions('portal:read_own_children')
  createParentReportCardDownload(@Param('reportCardId') reportCardId: string) {
    return this.examsService.createParentReportCardDownload(reportCardId);
  }

  @Get('report-cards/download/:token')
  @Permissions('portal:read_own_children')
  async downloadParentReportCard(@Param('token') token: string, @Res({ passthrough: true }) res: any) {
    const data = await this.examsService.readParentReportCardDownloadToken(token);
    const pdfService = new PdfService();
    const stream = pdfService.generatePdfStream(JSON.stringify(data, null, 2), { title: 'Report Card' });
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="report_card_${token}.pdf"`,
    });
    return new StreamableFile(stream);
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
  @Permissions('exams:review')
  getDepartmentMarks(@Query() query: Record<string, string | undefined>) {
    return this.examsService.getDepartmentMarks(query);
  }

  @Post('marks/moderate')
  @Permissions('exams:review')
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
  @Permissions('exams:read')
  publishExamSeries(@Param('id') id: string) {
    return this.examsService.publishExamSeries(id);
  }

  @Post('series/:id/unpublish')
  @Permissions('exams:read')
  unpublishExamSeries(@Param('id') id: string, @Body() dto: { reason?: string }) {
    return this.examsService.unpublishExamSeries(id, dto.reason ?? '');
  }

  @Post('timetable-slots')
  @Permissions('exams:write')
  createTimetableSlot(@Body() dto: CreateTimetableSlotDto) {
    return this.examsService.createTimetableSlot(dto);
  }

  @Patch('timetable-slots/:slotId')
  @Permissions('exams:write')
  updateTimetableSlot(@Param('slotId') slotId: string, @Body() dto: Partial<CreateTimetableSlotDto> & { status?: string }) {
    return this.examsService.updateTimetableSlot(slotId, dto);
  }

  @Post('invigilators')
  @Permissions('exams:write')
  assignInvigilator(@Body() dto: AssignInvigilatorDto) {
    return this.examsService.assignInvigilator(dto);
  }

  @Post('invigilators/auto-assign')
  @Permissions('exams:write')
  autoAssignInvigilators() {
    return this.examsService.autoAssignInvigilators();
  }

  @Patch('invigilators/:assignmentId/status')
  @Permissions('exams:write')
  updateInvigilatorStatus(@Param('assignmentId') assignmentId: string, @Body() dto: { status?: string }) {
    return this.examsService.updateInvigilatorStatus(assignmentId, dto.status);
  }

  @Post('invigilators/:assignmentId/remind')
  @Permissions('exams:write')
  remindInvigilator(@Param('assignmentId') assignmentId: string) {
    return this.examsService.remindInvigilator(assignmentId);
  }

  @Post('invigilators/:assignmentId/replace')
  @Permissions('exams:write')
  replaceInvigilator(@Param('assignmentId') assignmentId: string, @Body() dto: { replacement_staff_user_id?: string; role?: string }) {
    return this.examsService.replaceInvigilator(assignmentId, dto.replacement_staff_user_id, dto.role);
  }

  @Post('attendance')
  @Permissions('exams:write')
  markAttendance(@Body() dto: MarkExamAttendanceDto) {
    return this.examsService.markAttendance(dto);
  }

  @Post('attendance/import')
  @Permissions('exams:write')
  @UseInterceptors(StreamingUploadInterceptor('file'))
  importAttendance(@UploadedFile() file: UploadFileMetadata) {
    return this.examsService.importAttendance(file);
  }

  @Post('attendance/absentee-alerts')
  @Permissions('exams:write')
  sendExamAbsenceAlerts(@Body() dto: { attendance_ids?: string[] }) {
    return this.examsService.sendExamAbsenceAlerts(dto.attendance_ids);
  }

  @Patch('attendance/:attendanceId/lock')
  @Permissions('exams:write')
  lockExamAttendance(@Param('attendanceId') attendanceId: string) {
    return this.examsService.lockExamAttendance(attendanceId);
  }

  @Post('attendance/:attendanceId/special-case')
  @Permissions('exams:write')
  createAttendanceSpecialCase(@Param('attendanceId') attendanceId: string, @Body() dto: { case_type?: string; description?: string }) {
    return this.examsService.createAttendanceSpecialCase(attendanceId, dto.case_type, dto.description);
  }

  @Post('student-cases')
  @Permissions('exams:write')
  reportStudentCase(@Body() dto: ReportStudentExamCaseDto) {
    return this.examsService.reportStudentCase(dto);
  }

  @Patch('student-cases/:caseId/resolve')
  @Permissions('exams:write')
  resolveStudentCase(@Param('caseId') caseId: string, @Body() dto: { resolution?: string }) {
    return this.examsService.resolveStudentCase(caseId, dto.resolution);
  }

  @Post('student-cases/:caseId/request-guidance')
  @Permissions('exams:write')
  requestStudentCaseGuidance(@Param('caseId') caseId: string, @Body() dto: { note?: string }) {
    return this.examsService.requestStudentCaseGuidance(caseId, dto.note);
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

  @Post('grading-policies')
  @Permissions('exams:write')
  createGradingPolicy(@Body() dto: {
    name?: string;
    reporting_mode?: string;
    exam_series_id?: string;
    effective_from?: string;
    effective_to?: string;
    supersedes_policy_id?: string;
    scope?: Record<string, unknown>;
  }) {
    return this.examsService.createGradingPolicy(dto);
  }

  @Get('grading-policies/:policyId/impact')
  @Permissions('exams:read')
  getGradingPolicyImpact(@Param('policyId') policyId: string) {
    return this.examsService.getGradingPolicyImpact(policyId);
  }

  @Patch('grading-policies/:policyId/status')
  @Permissions('exams:write')
  transitionGradingPolicy(@Param('policyId') policyId: string, @Body() dto: { status?: string }) {
    return this.examsService.transitionGradingPolicy(policyId, dto.status);
  }

  @Patch('grading-policies/:policyId')
  @Permissions('exams:write')
  updateGradingPolicy(@Param('policyId') policyId: string, @Body() dto: {
    name?: string;
    reporting_mode?: string;
    exam_series_id?: string;
    effective_from?: string;
    effective_to?: string;
    scope?: Record<string, unknown>;
  }) {
    return this.examsService.updateGradingPolicy(policyId, dto);
  }

  @Delete('grading-policies/:policyId')
  @Permissions('exams:write')
  deleteDraftGradingPolicy(@Param('policyId') policyId: string) {
    return this.examsService.deleteDraftGradingPolicy(policyId);
  }

  @Get('grading-policies/:policyId/boundaries')
  @Permissions('exams:read')
  getGradingPolicyBoundaries(@Param('policyId') policyId: string) {
    return this.examsService.getGradingPolicyBoundaries(policyId);
  }

  @Post('grading-policies/:policyId/boundaries')
  @Permissions('exams:write')
  createGradingPolicyBoundary(@Param('policyId') policyId: string, @Body() dto: {
    label?: string;
    min_score?: number;
    max_score?: number;
    points?: number;
    descriptor?: string;
    remark?: string;
    is_pass?: boolean;
  }) {
    return this.examsService.createGradingPolicyBoundary(policyId, dto);
  }

  @Patch('grading-policy-boundaries/:boundaryId')
  @Permissions('exams:write')
  updateGradingPolicyBoundary(@Param('boundaryId') boundaryId: string, @Body() dto: {
    label?: string;
    min_score?: number;
    max_score?: number;
    points?: number;
    descriptor?: string;
    remark?: string;
    is_pass?: boolean;
  }) {
    return this.examsService.updateGradingPolicyBoundary(boundaryId, dto);
  }

  @Delete('grading-policy-boundaries/:boundaryId')
  @Permissions('exams:write')
  deleteGradingPolicyBoundary(@Param('boundaryId') boundaryId: string) {
    return this.examsService.deleteGradingPolicyBoundary(boundaryId);
  }

  @Get('settings')
  @Permissions('exams:read')
  getSettings() {
    return this.examsService.getSettings();
  }

  @Patch('settings')
  @Permissions('exams:write')
  updateSettings(@Body() dto: UpdateExamSettingsDto) {
    return this.examsService.updateSettings(dto);
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

  @Delete('subject-weightings/:weightingId')
  @Permissions('exams:write')
  deleteSubjectWeighting(@Param('weightingId') weightingId: string) {
    return this.examsService.deleteSubjectWeighting(weightingId);
  }

  @Get('assessment-components')
  @Permissions('exams:read')
  getAssessmentComponents(@Query() query: Record<string, string | undefined>) {
    return this.examsService.getAssessmentComponents(query);
  }

  @Post('assessment-components')
  @Permissions('exams:write')
  createAssessmentComponent(@Body() dto: { assessment_id?: string; component_code?: string; component_name?: string; max_score?: number; weight?: number }) {
    return this.examsService.createAssessmentComponent(dto);
  }

  @Patch('assessment-components/:componentId')
  @Permissions('exams:write')
  updateAssessmentComponent(
    @Param('componentId') componentId: string,
    @Body() dto: { component_code?: string; component_name?: string; max_score?: number; weight?: number },
  ) {
    return this.examsService.updateAssessmentComponent(componentId, dto);
  }

  @Delete('assessment-components/:componentId')
  @Permissions('exams:write')
  deleteAssessmentComponent(@Param('componentId') componentId: string) {
    return this.examsService.deleteAssessmentComponent(componentId);
  }

  @Get('mark-entry-windows')
  @Permissions('exams:read')
  getMarkEntryWindows(@Query() query: Record<string, string | undefined>) {
    return this.examsService.getMarkEntryWindows(query);
  }

  @Patch('mark-entry-windows/:markWindowId/transition')
  @Permissions('exams:write')
  transitionMarkWindow(@Param('markWindowId') markWindowId: string, @Body() dto: { action?: string; reason?: string }) {
    return this.examsService.transitionMarkWindow(markWindowId, dto.action, dto.reason);
  }

  @Post('mark-entry-windows/:markWindowId/remind')
  @Permissions('exams:write')
  remindMarkWindow(@Param('markWindowId') markWindowId: string) {
    return this.examsService.remindMarkWindow(markWindowId);
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
