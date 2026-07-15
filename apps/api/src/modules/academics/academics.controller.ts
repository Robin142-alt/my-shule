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
  CreateAssignmentDto,
  CreateResourceDto,
  CreateLessonLogDto,
} from './dto/academic.dto';
import { EnterExamMarkDto } from '../exams/dto/exams.dto';
import { AcademicsWidgetDataDto } from '../dashboard/dashboard.dto';

@Controller('academics')
@RequiresModule('academics')
export class AcademicsController {
  constructor(private readonly academicsService: AcademicsService) {}

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

  @Post('class-sections')
  @Permissions('academics:write')
  createClassSection(@Body() dto: CreateClassSectionDto) {
    return this.academicsService.createClassSection(dto);
  }

  @Post('class-streams')
  @Permissions('academics:write')
  createClassStream(@Body() dto: any) {
    return this.academicsService.createClassStream(dto);
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

  @Post('teacher-assignments')
  @Permissions('academics:assign-teachers')
  assignTeacher(@Body() dto: AssignTeacherDto) {
    return this.academicsService.assignTeacher(dto);
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
  updateAcademicYear(@Param('id') id: string, @Body() dto: import('./dto/academic.dto').UpdateAcademicYearDto) {
    return this.academicsService.updateAcademicYear(id, dto);
  }

  @Delete('years/:id')
  @Permissions('academics:write')
  archiveAcademicYear(@Param('id') id: string) {
    return this.academicsService.archiveAcademicYear(id);
  }

  @Patch('terms/:id')
  @Permissions('academics:write')
  updateAcademicTerm(@Param('id') id: string, @Body() dto: import('./dto/academic.dto').UpdateAcademicTermDto) {
    return this.academicsService.updateAcademicTerm(id, dto);
  }

  @Delete('terms/:id')
  @Permissions('academics:write')
  archiveAcademicTerm(@Param('id') id: string) {
    return this.academicsService.archiveAcademicTerm(id);
  }

  @Patch('class-sections/:id')
  @Permissions('academics:write')
  updateClassSection(@Param('id') id: string, @Body() dto: import('./dto/academic.dto').UpdateClassSectionDto) {
    return this.academicsService.updateClassSection(id, dto);
  }

  @Delete('class-sections/:id')
  @Permissions('academics:write')
  archiveClassSection(@Param('id') id: string) {
    return this.academicsService.archiveClassSection(id);
  }

  @Patch('subjects/:id')
  @Permissions('academics:write')
  updateSubject(@Param('id') id: string, @Body() dto: import('./dto/academic.dto').UpdateSubjectDto) {
    return this.academicsService.updateSubject(id, dto);
  }

  @Delete('subjects/:id')
  @Permissions('academics:write')
  archiveSubject(@Param('id') id: string) {
    return this.academicsService.archiveSubject(id);
  }

  @Get('grading-systems')
  @Permissions('academics:read')
  async listGradingSystems() {
    const tenantId = (this.academicsService as any).requestContext.getStore()?.tenant_id;
    const result = await (this.academicsService as any).repository.databaseService.query(
      `SELECT * FROM academics_grading_systems WHERE tenant_id = $1 AND is_active = true ORDER BY name ASC`,
      [tenantId]
    );
    return result.rows;
  }

  @Post('grading-systems')
  @Permissions('academics:write')
  async createGradingSystem(@Body() dto: { name: string; description?: string }) {
    const tenantId = (this.academicsService as any).requestContext.getStore()?.tenant_id;
    const result = await (this.academicsService as any).repository.databaseService.query(
      `INSERT INTO academics_grading_systems (tenant_id, name, description)
       VALUES ($1, $2, $3) RETURNING *`,
      [tenantId, dto.name, dto.description || null]
    );
    return result.rows[0];
  }

  @Patch('grading-systems/:id')
  @Permissions('academics:write')
  async updateGradingSystem(@Body() dto: { name?: string; description?: string }, @Param('id') id: string) {
    const tenantId = (this.academicsService as any).requestContext.getStore()?.tenant_id;
    const result = await (this.academicsService as any).repository.databaseService.query(
      `UPDATE academics_grading_systems 
       SET name = COALESCE($1, name), description = COALESCE($2, description), updated_at = NOW()
       WHERE tenant_id = $3 AND id = $4::uuid RETURNING *`,
      [dto.name, dto.description, tenantId, id]
    );
    return result.rows[0];
  }

  @Delete('grading-systems/:id')
  @Permissions('academics:write')
  async deleteGradingSystem(@Param('id') id: string) {
    const tenantId = (this.academicsService as any).requestContext.getStore()?.tenant_id;
    const result = await (this.academicsService as any).repository.databaseService.query(
      `UPDATE academics_grading_systems SET is_active = false, updated_at = NOW() WHERE tenant_id = $1 AND id = $2::uuid RETURNING *`,
      [tenantId, id]
    );
    return result.rows[0];
  }

  @Get('attendance-settings')
  @Permissions('academics:read')
  async listAttendanceSettings() {
    const tenantId = (this.academicsService as any).requestContext.getStore()?.tenant_id;
    const result = await (this.academicsService as any).repository.databaseService.query(
      `SELECT * FROM academics_attendance_settings WHERE tenant_id = $1 AND is_active = true ORDER BY name ASC`,
      [tenantId]
    );
    return result.rows;
  }

  @Post('attendance-settings')
  @Permissions('academics:write')
  async createAttendanceSetting(@Body() dto: { name: string; description?: string }) {
    const tenantId = (this.academicsService as any).requestContext.getStore()?.tenant_id;
    const result = await (this.academicsService as any).repository.databaseService.query(
      `INSERT INTO academics_attendance_settings (tenant_id, name, description)
       VALUES ($1, $2, $3) RETURNING *`,
      [tenantId, dto.name, dto.description || null]
    );
    return result.rows[0];
  }

  @Patch('attendance-settings/:id')
  @Permissions('academics:write')
  async updateAttendanceSetting(@Body() dto: { name?: string; description?: string }, @Param('id') id: string) {
    const tenantId = (this.academicsService as any).requestContext.getStore()?.tenant_id;
    const result = await (this.academicsService as any).repository.databaseService.query(
      `UPDATE academics_attendance_settings 
       SET name = COALESCE($1, name), description = COALESCE($2, description), updated_at = NOW()
       WHERE tenant_id = $3 AND id = $4::uuid RETURNING *`,
      [dto.name, dto.description, tenantId, id]
    );
    return result.rows[0];
  }

  @Delete('attendance-settings/:id')
  @Permissions('academics:write')
  async deleteAttendanceSetting(@Param('id') id: string) {
    const tenantId = (this.academicsService as any).requestContext.getStore()?.tenant_id;
    const result = await (this.academicsService as any).repository.databaseService.query(
      `UPDATE academics_attendance_settings SET is_active = false, updated_at = NOW() WHERE tenant_id = $1 AND id = $2::uuid RETURNING *`,
      [tenantId, id]
    );
    return result.rows[0];
  }

  // --- Departments ---
  @Get('departments')
  @Permissions('academics:read')
  listDepartments() {
    return this.academicsService.getDepartments();
  }

  @Post('departments')
  @Permissions('academics:write')
  createDepartment(@Body() dto: any) {
    return this.academicsService.createDepartment(dto);
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
  @Permissions('academics:write')
  assignClassTeacher(@Body() dto: any) {
    return this.academicsService.assignClassTeacher(dto);
  }

  @Delete('class-teachers/:id')
  @Permissions('academics:write')
  archiveClassTeacher(@Param('id') id: string) {
    return this.academicsService.archiveClassTeacher(id);
  }

  // --- Report Card Settings ---
  @Get('report-card-settings')
  @Permissions('academics:read')
  listReportCardSettings() {
    return this.academicsService.getReportCardSettings();
  }

  @Post('report-card-settings')
  @Permissions('academics:write')
  createReportCardSetting(@Body() dto: any) {
    return this.academicsService.createReportCardSetting(dto);
  }

  @Delete('report-card-settings/:id')
  @Permissions('academics:write')
  archiveReportCardSetting(@Param('id') id: string) {
    return this.academicsService.archiveReportCardSetting(id);
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
