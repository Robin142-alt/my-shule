import { Body, Controller, Get, Post, Query, Param, Patch, Delete, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';

import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { AcademicsService } from './academics.service';
import {
  AssignTeacherDto,
  AssignStudentToClassDto,
  CreateAcademicTermDto,
  CreateAcademicYearDto,
  CreateClassSectionDto,
  CreateClassStructureDto,
  CreateSubjectDto,
  CreateAttendanceDto,
  AcademicPolicyDto,
  CreateAcademicPolicyDto,
  CreateDepartmentDto,
  AcademicRoleAppointmentDto,
  AcademicMergeDto,
  AcademicBulkLifecycleDto,
  AcademicBulkDependencyPreviewDto,
  AcademicCurriculumConfigurationDto,
  CreateAcademicCurriculumConfigurationDto,
  ReassignTeacherDto,
  CreateAssignmentDto,
  CreateResourceDto,
  CreateLessonLogDto,
  AcademicLifecycleDto,
  AssignClassTeacherDto,
  CreateClassStreamDto,
  CreateClassSubjectAssignmentDto,
  UpdateClassSubjectAssignmentDto,
  CreateAcademicCalendarPeriodDto,
  UpdateAcademicCalendarPeriodDto,
  EndAssignmentDto,
  UpdateAcademicTermDto,
  UpdateAcademicYearDto,
  UpdateClassSectionDto,
  UpdateClassStreamDto,
  UpdateDepartmentDto,
  UpdateSubjectDto,
} from './dto/academic.dto';
import { EnterExamMarkDto } from '../exams/dto/exams.dto';
import { AcademicsWidgetDataDto } from '../dashboard/dashboard.dto';

@Controller('academics')
@RequiresModule('academics')
export class AcademicsController {
  constructor(private readonly academicsService: AcademicsService) {}

  @Get('foundation')
  @Permissions('academics:read')
  getAcademicFoundation() {
    return this.academicsService.getAcademicFoundation();
  }

  @Post('years')
  @Permissions('academics:write')
  createAcademicYear(@Body() dto: CreateAcademicYearDto) {
    return this.academicsService.createAcademicYear(dto);
  }

  @Post('terms')
  @Permissions('academics:write')
  createAcademicTerm(@Body() dto: CreateAcademicTermDto) {
    return this.academicsService.createAcademicTerm(dto);
  }

  @Post('calendar-periods')
  @Permissions('academics:write')
  createAcademicCalendarPeriod(@Body() dto: CreateAcademicCalendarPeriodDto) {
    return this.academicsService.createAcademicCalendarPeriod(dto);
  }

  @Patch('calendar-periods/:id')
  @Permissions('academics:write')
  updateAcademicCalendarPeriod(@Param('id') id: string, @Body() dto: UpdateAcademicCalendarPeriodDto) {
    return this.academicsService.updateAcademicCalendarPeriod(id, dto);
  }

  @Post('class-sections')
  @Permissions('academics:write')
  createClassSection(@Body() dto: CreateClassSectionDto) {
    return this.academicsService.createClassSection(dto);
  }

  @Post('class-streams')
  @Permissions('academics:write')
  createClassStream(@Body() dto: CreateClassStreamDto) {
    return this.academicsService.createClassStream(dto);
  }

  @Get('class-streams')
  @Permissions('academics:read')
  listClassStreams() {
    return this.academicsService.listClassStreams();
  }

  @Post('class-structure')
  @Permissions('academics:write')
  createClassStructure(@Body() dto: CreateClassStructureDto) {
    return this.academicsService.createClassStructure(dto);
  }

  @Post('subjects')
  @Permissions('academics:write')
  createSubject(@Body() dto: CreateSubjectDto) {
    return this.academicsService.createSubject(dto);
  }

  @Post('class-subjects')
  @Permissions('academics:write')
  createClassSubjectAssignment(@Body() dto: CreateClassSubjectAssignmentDto) {
    return this.academicsService.createClassSubjectAssignment(dto);
  }

  @Patch('class-subjects/:id')
  @Permissions('academics:write')
  updateClassSubjectAssignment(@Param('id') id: string, @Body() dto: UpdateClassSubjectAssignmentDto) {
    return this.academicsService.updateClassSubjectAssignment(id, dto);
  }

  @Post('teacher-assignments')
  @Permissions('academics:assign-teachers')
  assignTeacher(@Body() dto: AssignTeacherDto) {
    return this.academicsService.assignTeacher(dto);
  }

  @Delete('teacher-assignments/:id')
  @Permissions('academics:assign-teachers')
  archiveTeacherAssignment(@Param('id') id: string) {
    return this.academicsService.archiveTeacherAssignment(id);
  }

  @Post('teacher-assignments/:id/end')
  @Permissions('academics:assign-teachers')
  endTeacherAssignment(@Param('id') id: string, @Body() dto: EndAssignmentDto) {
    return this.academicsService.archiveTeacherAssignment(id, dto);
  }

  @Get('teachers')
  @Permissions('academics:read')
  listTeacherOptions() {
    return this.academicsService.listTeacherOptions();
  }

  @Post('student-class-assignments')
  @Permissions('students:write', 'academics:write')
  assignStudentToClass(@Body() dto: AssignStudentToClassDto) {
    return this.academicsService.assignStudentToClass(dto);
  }

  @Get('teacher-assignments')
  @Permissions('academics:read')
  listTeacherAssignments(
    @Query('teacher_user_id') teacherUserId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.academicsService.listTeacherAssignments(teacherUserId, limit, offset);
  }

  @Post('attendance')
  @Permissions('academics:write')
  createAttendance(@Body() dto: CreateAttendanceDto) {
    return this.academicsService.createAttendance(dto);
  }

  @Post('assignments')
  @Permissions('academics:write')
  createAssignment(@Body() dto: CreateAssignmentDto) {
    return this.academicsService.createAssignment(dto);
  }

  @Post('resources')
  @Permissions('academics:write')
  createResource(@Body() dto: CreateResourceDto) {
    return this.academicsService.createResource(dto);
  }

  @Post('marks')
  @Permissions('academics:write')
  enterMarks(@Body() dto: EnterExamMarkDto) {
    return this.academicsService.enterMarks(dto);
  }

  @Get('my-assignments')
  @Permissions('academics:read')
  getMyAssignments() {
    return this.academicsService.getMyAssignments();
  }

  @Get('my-resources')
  @Permissions('academics:read')
  getMyResources() {
    return this.academicsService.getMyResources();
  }

  @Post('lesson-logs')
  @Permissions('academics:write')
  createLessonLog(@Body() dto: CreateLessonLogDto) {
    return this.academicsService.createLessonLog(dto);
  }

  @Get('my-lesson-logs')
  @Permissions('academics:read')
  getMyLessonLogs() {
    return this.academicsService.getMyLessonLogs();
  }

  @Get('my-attendance')
  @Permissions('academics:read')
  getMyAttendance() {
    return this.academicsService.getMyAttendance();
  }

  @Get('academic-years')
  @Permissions('academics:read')
  listAcademicYears() {
    return this.academicsService.listAcademicYears();
  }

  @Get('academic-terms')
  @Permissions('academics:read')
  listAcademicTerms() {
    return this.academicsService.listAcademicTerms();
  }

  @Get('class-sections')
  @Permissions('academics:read')
  listClassSections() {
    return this.academicsService.listClassSections();
  }

  @Get('subjects')
  @Permissions('academics:read')
  listSubjects() {
    return this.academicsService.listSubjects();
  }

  @Get('summary')
  @Permissions('academics:read')
  async getSummary(): Promise<AcademicsWidgetDataDto> {
    const store = (this as any).requestContext?.getStore();
    return this.academicsService.getSummary();
  }

  @Patch('years/:id')
  @Permissions('academics:write')
  updateAcademicYear(@Param('id') id: string, @Body() dto: UpdateAcademicYearDto) {
    return this.academicsService.updateAcademicYear(id, dto);
  }

  @Delete('years/:id')
  @Permissions('academics:write')
  archiveAcademicYear(@Param('id') id: string) {
    return this.academicsService.archiveAcademicYear(id);
  }

  @Patch('terms/:id')
  @Permissions('academics:write')
  updateAcademicTerm(@Param('id') id: string, @Body() dto: UpdateAcademicTermDto) {
    return this.academicsService.updateAcademicTerm(id, dto);
  }

  @Delete('terms/:id')
  @Permissions('academics:write')
  archiveAcademicTerm(@Param('id') id: string) {
    return this.academicsService.archiveAcademicTerm(id);
  }

  @Patch('class-sections/:id')
  @Permissions('academics:write')
  updateClassSection(@Param('id') id: string, @Body() dto: UpdateClassSectionDto) {
    return this.academicsService.updateClassSection(id, dto);
  }

  @Delete('class-sections/:id')
  @Permissions('academics:write')
  archiveClassSection(@Param('id') id: string) {
    return this.academicsService.archiveClassSection(id);
  }

  @Patch('subjects/:id')
  @Permissions('academics:write')
  updateSubject(@Param('id') id: string, @Body() dto: UpdateSubjectDto) {
    return this.academicsService.updateSubject(id, dto);
  }

  @Delete('subjects/:id')
  @Permissions('academics:write')
  archiveSubject(@Param('id') id: string) {
    return this.academicsService.archiveSubject(id);
  }

  @Patch('class-streams/:id')
  @Permissions('academics:write')
  updateClassStream(@Param('id') id: string, @Body() dto: UpdateClassStreamDto) {
    return this.academicsService.updateClassStream(id, dto);
  }

  @Delete('class-streams/:id')
  @Permissions('academics:write')
  archiveClassStream(@Param('id') id: string) {
    return this.academicsService.manageSetupLifecycle('class-stream', id, {
      action: 'archive', reason: 'Archived from academic setup',
    });
  }

  @Get('grading-systems')
  @Permissions('academics:read')
  listGradingSystems() {
    return this.academicsService.listGradingSystems();
  }

  @Post('grading-systems')
  @Permissions('academics:write')
  createGradingSystem(@Body() dto: CreateAcademicPolicyDto) {
    return this.academicsService.createGradingSystem(dto);
  }

  @Patch('grading-systems/:id')
  @Permissions('academics:write')
  updateGradingSystem(@Body() dto: AcademicPolicyDto, @Param('id') id: string) {
    return this.academicsService.updateGradingSystem(id, dto);
  }

  @Delete('grading-systems/:id')
  @Permissions('academics:write')
  deleteGradingSystem(@Param('id') id: string) {
    return this.academicsService.archiveGradingSystem(id);
  }

  @Get('attendance-settings')
  @Permissions('academics:read')
  listAttendanceSettings() {
    return this.academicsService.listAttendanceSettings();
  }

  @Post('attendance-settings')
  @Permissions('academics:write')
  createAttendanceSetting(@Body() dto: CreateAcademicPolicyDto) {
    return this.academicsService.createAttendanceSetting(dto);
  }

  @Patch('attendance-settings/:id')
  @Permissions('academics:write')
  updateAttendanceSetting(@Body() dto: AcademicPolicyDto, @Param('id') id: string) {
    return this.academicsService.updateAttendanceSetting(id, dto);
  }

  @Delete('attendance-settings/:id')
  @Permissions('academics:write')
  deleteAttendanceSetting(@Param('id') id: string) {
    return this.academicsService.archiveAttendanceSetting(id);
  }

  // --- Departments ---
  @Get('departments')
  @Permissions('academics:read')
  listDepartments() {
    return this.academicsService.getDepartments();
  }

  @Post('departments')
  @Permissions('academics:write')
  createDepartment(@Body() dto: CreateDepartmentDto) {
    return this.academicsService.createDepartment(dto);
  }

  @Patch('departments/:id')
  @Permissions('academics:write')
  updateDepartment(@Param('id') id: string, @Body() dto: UpdateDepartmentDto) {
    return this.academicsService.updateDepartment(id, dto);
  }

  @Delete('departments/:id')
  @Permissions('academics:write')
  archiveDepartment(@Param('id') id: string) {
    return this.academicsService.archiveDepartment(id);
  }

  // --- Class Teachers ---
  @Get('class-teachers')
  @Permissions('academics:read')
  listClassTeachers() {
    return this.academicsService.getClassTeachers();
  }

  @Post('class-teachers')
  @Permissions('academics:assign-teachers')
  assignClassTeacher(@Body() dto: AssignClassTeacherDto) {
    return this.academicsService.assignClassTeacher(dto);
  }

  @Delete('class-teachers/:id')
  @Permissions('academics:assign-teachers')
  archiveClassTeacher(@Param('id') id: string) {
    return this.academicsService.archiveClassTeacher(id);
  }

  @Post('class-teachers/:id/end')
  @Permissions('academics:assign-teachers')
  endClassTeacher(@Param('id') id: string, @Body() dto: EndAssignmentDto) {
    return this.academicsService.archiveClassTeacher(id, dto);
  }

  // --- Report Card Settings ---
  @Get('report-card-settings')
  @Permissions('academics:read')
  listReportCardSettings() {
    return this.academicsService.getReportCardSettings();
  }

  @Post('report-card-settings')
  @Permissions('academics:write')
  createReportCardSetting(@Body() dto: CreateAcademicPolicyDto) {
    return this.academicsService.createReportCardSetting(dto);
  }

  @Patch('report-card-settings/:id')
  @Permissions('academics:write')
  updateReportCardSetting(@Param('id') id: string, @Body() dto: AcademicPolicyDto) {
    return this.academicsService.updateReportCardSetting(id, dto);
  }

  @Delete('report-card-settings/:id')
  @Permissions('academics:write')
  archiveReportCardSetting(@Param('id') id: string) {
    return this.academicsService.archiveReportCardSetting(id);
  }

  @Get('setup/:entityType/:id/dependencies')
  @Permissions('academics:read')
  getSetupDependencies(@Param('entityType') entityType: string, @Param('id') id: string) {
    return this.academicsService.getSetupDependencies(entityType, id);
  }

  @Get('setup/:entityType/:id/history')
  @Permissions('academics:read')
  getSetupHistory(@Param('entityType') entityType: string, @Param('id') id: string) {
    return this.academicsService.getSetupHistory(entityType, id);
  }

  @Post('setup/:entityType/:id/lifecycle')
  @Permissions('academics:manage-lifecycle')
  manageSetupLifecycle(
    @Param('entityType') entityType: string,
    @Param('id') id: string,
    @Body() dto: AcademicLifecycleDto,
  ) {
    return this.academicsService.manageSetupLifecycle(entityType, id, dto);
  }

  @Post('academic-roles')
  @Permissions('academics:assign-teachers')
  assignAcademicRole(@Body() dto: AcademicRoleAppointmentDto) {
    return this.academicsService.assignAcademicRole(dto);
  }

  @Post('academic-roles/:id/end')
  @Permissions('academics:assign-teachers')
  endAcademicRole(@Param('id') id: string, @Body() dto: EndAssignmentDto) {
    return this.academicsService.endAcademicRole(id, dto);
  }

  @Post('curriculum-configurations')
  @Permissions('academics:write')
  createCurriculumConfiguration(@Body() dto: CreateAcademicCurriculumConfigurationDto) {
    return this.academicsService.createCurriculumConfiguration(dto);
  }

  @Patch('curriculum-configurations/:id')
  @Permissions('academics:write')
  updateCurriculumConfiguration(@Param('id') id: string, @Body() dto: AcademicCurriculumConfigurationDto) {
    return this.academicsService.updateCurriculumConfiguration(id, dto);
  }

  @Get('teacher-assignments/:id/reassignment-preview')
  @Permissions('academics:assign-teachers')
  previewTeacherReassignment(@Param('id') id: string) {
    return this.academicsService.previewTeacherReassignment(id);
  }

  @Post('teacher-assignments/:id/reassign')
  @Permissions('academics:assign-teachers')
  reassignTeacher(@Param('id') id: string, @Body() dto: ReassignTeacherDto) {
    return this.academicsService.reassignTeacher(id, dto);
  }

  @Get('setup/:entityType/:id/merge-preview')
  @Permissions('academics:merge')
  previewSetupMerge(@Param('entityType') entityType: string, @Param('id') id: string, @Query('target_id') targetId: string) {
    return this.academicsService.previewSetupMerge(entityType, id, targetId);
  }

  @Post('setup/:entityType/:id/merge')
  @Permissions('academics:merge')
  mergeSetup(@Param('entityType') entityType: string, @Param('id') id: string, @Body() dto: AcademicMergeDto) {
    return this.academicsService.mergeSetupRecords(entityType, id, dto);
  }

  @Post('setup/:entityType/bulk-lifecycle')
  @Permissions('academics:manage-lifecycle')
  bulkManageSetup(@Param('entityType') entityType: string, @Body() dto: AcademicBulkLifecycleDto) {
    return this.academicsService.bulkManageSetup(entityType, dto);
  }

  @Post('setup/:entityType/bulk-dependencies')
  @Permissions('academics:read')
  getBulkSetupDependencies(@Param('entityType') entityType: string, @Body() dto: AcademicBulkDependencyPreviewDto) {
    return this.academicsService.getBulkSetupDependencies(entityType, dto.ids);
  }

  @Get('years')
  @Permissions('academics:read')
  getYears() {
    return this.academicsService.listAcademicYears();
  }

  @Get('terms')
  @Permissions('academics:read')
  getTerms() {
    return this.academicsService.listAcademicTerms();
  }

  @Get('assignments')
  @Permissions('academics:read')
  getAssignments() {
    return this.academicsService.getMyAssignments();
  }

  @Get('lesson-logs')
  @Permissions('academics:read')
  getLessonLogs() {
    return this.academicsService.getMyLessonLogs();
  }

  @Get('communications')
  @Permissions('academics:read')
  async getCommunications() {
    const tenantId = (this.academicsService as any).requestContext.getStore()?.tenant_id;
    if (!tenantId) throw new UnauthorizedException('Tenant ID required');
    try {
      const items = await (this.academicsService as any).repository.prisma.communicationBroadcast.findMany({
        where: { schoolId: tenantId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      return { items };
    } catch (e: any) {
      console.error('academics.controller error:', e);
      throw new InternalServerErrorException(e.message);
    }
  }
}
