import { BadRequestException, Injectable, UnauthorizedException, Inject, forwardRef } from '@nestjs/common';

import { RequestContextService } from '../../common/request-context/request-context.service';
import { ExamsService } from '../exams/exams.service';
import { EnterExamMarkDto } from '../exams/dto/exams.dto';
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
import { AcademicsRepository } from './repositories/academics.repository';

@Injectable()
export class AcademicsService {
  constructor(
    @Inject(forwardRef(() => RequestContextService))
    private readonly requestContext: RequestContextService,
    @Inject(forwardRef(() => AcademicsRepository))
    private readonly repository: AcademicsRepository,
    @Inject(forwardRef(() => ExamsService))
    private readonly examsService: ExamsService,
  ) {}

  async createAcademicYear(dto: CreateAcademicYearDto) {
    const tenantId = this.requireTenantId();
    const year = await this.repository.createAcademicYear({
      tenant_id: tenantId,
      created_by_user_id: this.currentUserId(),
      name: this.requireText(dto.name, 'Academic year name'),
      starts_on: dto.starts_on,
      ends_on: dto.ends_on,
    });
    await this.auditMutation(tenantId, 'academic_year', year?.id, 'academics.academic_year_created', { name: dto.name });
    return year;
  }

  async createAcademicTerm(dto: CreateAcademicTermDto) {
    const tenantId = this.requireTenantId();
    const term = await this.repository.createAcademicTerm({
      tenant_id: tenantId,
      created_by_user_id: this.currentUserId(),
      academic_year_id: this.requireText(dto.academic_year_id, 'Academic year'),
      name: this.requireText(dto.name, 'Academic term name'),
      starts_on: dto.starts_on,
      ends_on: dto.ends_on,
    });
    await this.auditMutation(tenantId, 'academic_term', term?.id, 'academics.academic_term_created', {
      academic_year_id: dto.academic_year_id,
      name: dto.name,
    });
    return term;
  }

  async createClassSection(dto: CreateClassSectionDto) {
    const tenantId = this.requireTenantId();
    const classSection = await this.repository.createClassSection({
      tenant_id: tenantId,
      created_by_user_id: this.currentUserId(),
      academic_year_id: this.requireText(dto.academic_year_id, 'Academic year'),
      academic_level_id: dto.academic_level_id?.trim() || null,
      name: this.requireText(dto.name, 'Class section name'),
      grade_level: this.requireText(dto.grade_level, 'Grade level'),
      stream: dto.stream?.trim() || null,
      custom_label: dto.custom_label?.trim() || null,
      capacity: dto.capacity ?? null,
    });
    await this.auditMutation(tenantId, 'class_section', classSection?.id, 'academics.class_section_created', {
      academic_year_id: dto.academic_year_id,
      name: dto.name,
    });
    return classSection;
  }

  async createClassStructure(dto: CreateClassStructureDto) {
    const tenantId = this.requireTenantId();
    const structure = await this.repository.createClassStructure({
      tenant_id: tenantId,
      created_by_user_id: this.currentUserId(),
      system_type: this.requireAcademicSystemType(dto.system_type),
      levels: (dto.levels ?? []).map((level) => ({
        name: this.requireText(level.name, 'Academic level name'),
        order_index: this.requirePositiveInteger(level.order_index, 'Academic level order'),
        classes: (level.classes ?? []).map((classSection) => ({
          name: this.requireText(classSection.name, 'Class name'),
          custom_label: classSection.custom_label?.trim() || undefined,
          capacity: classSection.capacity,
          streams: (classSection.streams ?? []).map((stream) => ({
            name: this.requireText(stream.name, 'Stream name'),
            capacity: stream.capacity,
            class_teacher_id: stream.class_teacher_id?.trim() || undefined,
          })),
        })),
      })),
    });

    await this.repository.appendAuditLog({
      tenant_id: tenantId,
      entity_type: 'class_structure',
      entity_id: null,
      action: 'academics.class_structure_created',
      actor_user_id: this.currentUserId(),
      metadata: {
        system_type: dto.system_type,
        level_count: dto.levels?.length ?? 0,
      },
    });

    return structure;
  }

  async createSubject(dto: CreateSubjectDto) {
    const tenantId = this.requireTenantId();
    const departmentId = dto.department_id?.trim() || null;
    if (departmentId) {
      const department = await this.repository.executeSql(
        tenantId,
        `SELECT id
         FROM academics_departments
         WHERE tenant_id = $1
           AND id::text = $2
           AND is_active = true
         LIMIT 1`,
        [tenantId, departmentId],
      );
      if (!department.rows[0]) {
        throw new BadRequestException('Select an active academic department from this school.');
      }
    }

    const subject = await this.repository.createSubject({
      tenant_id: tenantId,
      created_by_user_id: this.currentUserId(),
      code: this.requireText(dto.code, 'Subject code'),
      name: this.requireText(dto.name, 'Subject name'),
      department_id: departmentId,
    });
    await this.auditMutation(tenantId, 'subject', subject?.id, 'academics.subject_created', {
      code: dto.code,
      department_id: departmentId,
    });
    return subject;
  }

  async assignTeacher(dto: AssignTeacherDto) {
    const tenantId = this.requireTenantId();
    const teacherUserId = this.requireText(dto.teacher_user_id, 'Teacher');
    await this.requireActiveStaffUserInTenant(tenantId, teacherUserId);
    
    // Check for overlap
    const existing = await this.repository.executeSql(
      tenantId,
      `SELECT id FROM teacher_subject_assignments 
       WHERE tenant_id = $1 
         AND academic_term_id = $2
         AND class_section_id = $3
         AND subject_id = $4
         AND status = 'active'`,
      [tenantId, dto.academic_term_id, dto.class_section_id, dto.subject_id]
    );

    if (existing.rows.length > 0) {
      throw new BadRequestException('A teacher is already assigned to this subject for this class in this term.');
    }

    const assignment = await this.repository.createTeacherAssignment({
      tenant_id: tenantId,
      created_by_user_id: this.currentUserId(),
      academic_term_id: this.requireText(dto.academic_term_id, 'Academic term'),
      class_section_id: this.requireText(dto.class_section_id, 'Class section'),
      subject_id: this.requireText(dto.subject_id, 'Subject'),
      teacher_user_id: teacherUserId,
    });

    await this.repository.appendAuditLog({
      tenant_id: tenantId,
      entity_type: 'teacher_subject_assignment',
      entity_id: assignment.id,
      action: 'academics.teacher_subject_assigned',
      actor_user_id: this.currentUserId(),
      metadata: {
        academic_term_id: dto.academic_term_id,
        class_section_id: dto.class_section_id,
        subject_id: dto.subject_id,
        teacher_user_id: teacherUserId,
      },
    });

    return assignment;
  }

  async archiveTeacherAssignment(id: string) {
    const tenantId = this.requireTenantId();
    const assignment = await this.repository.archiveTeacherAssignment(tenantId, this.requireText(id, 'Teacher assignment ID'));
    if (!assignment) {
      throw new BadRequestException('Teacher assignment was not found in this school');
    }
    await this.auditMutation(tenantId, 'teacher_subject_assignment', assignment.id, 'academics.teacher_subject_unassigned', {});
    return assignment;
  }

  async assignStudentToClass(dto: AssignStudentToClassDto) {
    const tenantId = this.requireTenantId();
    const assignment = await this.repository.assignStudentToClass({
      tenant_id: tenantId,
      student_id: this.requireText(dto.student_id, 'Student'),
      class_section_id: this.requireText(dto.class_section_id, 'Class'),
      stream_id: dto.stream_id?.trim() || null,
      academic_level_id: this.requireText(dto.academic_level_id, 'Academic level'),
      academic_year_id: this.requireText(dto.academic_year_id, 'Academic year'),
      assigned_by_user_id: this.currentUserId(),
    });

    await this.repository.appendAuditLog({
      tenant_id: tenantId,
      entity_type: 'student_class_assignment',
      entity_id: (assignment as any).id,
      action: 'academics.student_class_assigned',
      actor_user_id: this.currentUserId(),
      metadata: {
        student_id: dto.student_id,
        class_section_id: dto.class_section_id,
        stream_id: dto.stream_id ?? null,
        academic_year_id: dto.academic_year_id,
      },
    });

    return assignment;
  }

  listTeacherAssignments(
    teacherUserId?: string,
    limit?: string | number,
    offset?: string | number,
  ) {
    return this.repository.listTeacherAssignments({
      tenantId: this.requireTenantId(),
      teacherUserId: teacherUserId?.trim() || undefined,
      limit: this.resolveLimit(limit, 25, 1, 300),
      offset: this.resolveOffset(offset),
    });
  }

  listTeacherOptions() {
    return this.repository.listTeacherOptions(this.requireTenantId());
  }

  getAcademicFoundation() {
    return this.repository.getAcademicFoundation(this.requireTenantId());
  }

  private requireTenantId(): string {
    const tenantId = this.requestContext.getStore()?.tenant_id;

    if (!tenantId) {
      throw new UnauthorizedException('Tenant context is required for academic operations');
    }

    return tenantId;
  }

  private currentUserId(): string | null {
    return this.requestContext.getStore()?.user_id ?? null;
  }

  private requireText(value: string | undefined, fieldName: string): string {
    const normalized = value?.trim() ?? '';

    if (!normalized) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    return normalized;
  }

  private requireAcademicSystemType(value: string | undefined): string {
    const normalized = this.requireText(value, 'Academic system type');

    if (!['CBC', 'CBE', '8-4-4', 'International', 'Custom'].includes(normalized)) {
      throw new BadRequestException('Academic system type must be CBC, CBE, 8-4-4, International, or Custom');
    }

    return normalized;
  }

  private requirePositiveInteger(value: number | undefined, fieldName: string): number {
    const numericValue = Number(value);

    if (!Number.isInteger(numericValue) || numericValue < 0) {
      throw new BadRequestException(`${fieldName} must be a non-negative integer`);
    }

    return numericValue;
  }

  private resolveLimit(
    value: string | number | undefined,
    fallback: number,
    minimum: number,
    maximum: number,
  ): number {
    const parsed = Number(value ?? fallback);

    if (!Number.isFinite(parsed)) {
      return fallback;
    }

    return Math.min(Math.max(Math.floor(parsed), minimum), maximum);
  }

  private resolveOffset(value: string | number | undefined): number {
    const parsed = Number(value ?? 0);

    if (!Number.isFinite(parsed)) {
      return 0;
    }

    return Math.max(Math.floor(parsed), 0);
  }

  createAttendance(dto: CreateAttendanceDto) {
    return this.repository.createAttendance({
      tenant_id: this.requireTenantId(),
      class_id: this.requireText(dto.class_id, 'Class ID'),
      attendance_date: this.requireText(dto.attendance_date, 'Attendance Date'),
      student_id: this.requireText(dto.student_id, 'Student ID'),
      status: this.requireText(dto.status, 'Status'),
      submitted_by: this.currentUserId(),
    });
  }

  createAssignment(dto: CreateAssignmentDto) {
    return this.repository.createAssignment({
      tenant_id: this.requireTenantId(),
      title: this.requireText(dto.title, 'Title'),
      description: dto.description,
      class_id: this.requireText(dto.class_id, 'Class ID'),
      subject_id: this.requireText(dto.subject_id, 'Subject ID'),
      due_date: this.requireText(dto.due_date, 'Due Date'),
      teacher_id: this.currentUserId(),
      status: dto.status,
    });
  }

  createResource(dto: CreateResourceDto) {
    return this.repository.createResource({
      tenant_id: this.requireTenantId(),
      title: this.requireText(dto.title, 'Title'),
      type: this.requireText(dto.type, 'Type'),
      url: dto.url,
      class_id: this.requireText(dto.class_id, 'Class ID'),
      subject_id: this.requireText(dto.subject_id, 'Subject ID'),
      teacher_id: this.currentUserId(),
      status: dto.status,
    });
  }

  enterMarks(dto: EnterExamMarkDto) {
    // Delegate to ExamsService to prevent duplicate logic/tables
    // Delegate to ExamsService to prevent duplicate logic/tables
    return this.examsService.enterMark(dto);
  }

  getMyAssignments() {
    return this.repository.listMyAssignments(this.requireTenantId(), this.currentUserId() ?? 'unknown');
  }

  getMyResources() {
    return this.repository.listMyResources(this.requireTenantId(), this.currentUserId() ?? 'unknown');
  }

  createLessonLog(dto: CreateLessonLogDto) {
    return this.repository.createLessonLog({
      tenant_id: this.requireTenantId(),
      class_id: this.requireText(dto.class_id, 'Class ID'),
      subject_id: this.requireText(dto.subject_id, 'Subject ID'),
      teacher_id: this.currentUserId(),
      topic: this.requireText(dto.topic, 'Topic'),
      notes: dto.notes,
      date: dto.date ?? new Date().toISOString().split('T')[0],
      
    });
  }

  private async requireActiveStaffUserInTenant(tenantId: string, userId: string) {
    const teacher = await this.repository.findTeacherOptionByUserId(tenantId, userId);

    if (!teacher) {
      throw new BadRequestException('Selected staff member must be an active staff member in this school');
    }

    return teacher;
  }

  getMyLessonLogs() {
    return this.repository.listMyLessonLogs(this.requireTenantId(), this.currentUserId() ?? 'unknown');
  }

  getMyAttendance() {
    return this.repository.listMyAttendance(this.requireTenantId(), this.currentUserId() ?? 'unknown');
  }

  listAcademicYears() {
    return this.repository.listAcademicYears(this.requireTenantId());
  }

  listAcademicTerms() {
    return this.repository.listAcademicTerms(this.requireTenantId());
  }

  listClassSections() {
    return this.repository.listClassSections(this.requireTenantId());
  }

  listSubjects() {
    return this.repository.listSubjects(this.requireTenantId());
  }

  async getSummary() {
    const tenantId = this.requireTenantId();
    return this.repository.getSummary(tenantId);
  }

  updateAcademicYear(id: string, dto: any) {
    return this.repository.updateAcademicYear(this.requireTenantId(), id, dto);
  }

  archiveAcademicYear(id: string) {
    return this.repository.archiveAcademicYear(this.requireTenantId(), id);
  }

  updateAcademicTerm(id: string, dto: any) {
    return this.repository.updateAcademicTerm(this.requireTenantId(), id, dto);
  }

  archiveAcademicTerm(id: string) {
    return this.repository.archiveAcademicTerm(this.requireTenantId(), id);
  }

  updateClassSection(id: string, dto: any) {
    return this.repository.updateClassSection(this.requireTenantId(), id, dto);
  }

  archiveClassSection(id: string) {
    return this.repository.archiveClassSection(this.requireTenantId(), id);
  }

  updateSubject(id: string, dto: any) {
    return this.repository.updateSubject(this.requireTenantId(), id, dto);
  }

  archiveSubject(id: string) {
    return this.repository.archiveSubject(this.requireTenantId(), id);
  }

  async createClassStream(dto: any) {
    const tenantId = this.requireTenantId();
    const stream = await this.repository.createClassStream(
      tenantId,
      this.requireText(dto.class_section_id, 'Class Section ID'),
      this.requireText(dto.name, 'Stream Name'),
      dto.capacity
    );
    await this.auditMutation(tenantId, 'class_stream', stream?.id, 'academics.class_stream_created', {
      class_section_id: dto.class_section_id,
      name: dto.name,
    });
    return stream;
  }

  listClassStreams() {
    return this.repository.listClassStreams(this.requireTenantId());
  }

  // --- Departments ---
  getDepartments() {
    return this.repository.getDepartments(this.requireTenantId());
  }

  async createDepartment(dto: any) {
    const tenantId = this.requireTenantId();
    const hodUserId = dto.head_of_department_user_id?.trim() || null;

    if (hodUserId) {
      await this.requireActiveStaffUserInTenant(tenantId, hodUserId);
    }

    const department = await this.repository.createDepartment(
      tenantId,
      this.requireText(dto.name, 'Department name'),
      hodUserId
    );
    await this.auditMutation(tenantId, 'academic_department', department?.id, 'academics.department_created', {
      name: dto.name,
      head_of_department_user_id: hodUserId,
    });
    return department;
  }

  async updateDepartment(id: string, dto: any) {
    const tenantId = this.requireTenantId();
    const hodUserId = dto.head_of_department_user_id?.trim() || null;
    if (hodUserId) {
      await this.requireActiveStaffUserInTenant(tenantId, hodUserId);
    }
    const department = await this.repository.updateDepartment(
      tenantId,
      this.requireText(id, 'Department ID'),
      dto.name?.trim() || null,
      hodUserId,
    );
    if (!department) {
      throw new BadRequestException('Department was not found in this school');
    }
    await this.auditMutation(tenantId, 'academic_department', department.id, 'academics.department_updated', {
      head_of_department_user_id: hodUserId,
    });
    return department;
  }

  archiveDepartment(id: string) {
    return this.repository.archiveDepartment(this.requireTenantId(), id);
  }

  // --- Class Teachers ---
  getClassTeachers() {
    return this.repository.getClassTeachers(this.requireTenantId());
  }

  async assignClassTeacher(dto: any) {
    const tenantId = this.requireTenantId();
    const teacherUserId = this.requireText(dto.teacher_user_id, 'Teacher user ID');
    await this.requireActiveStaffUserInTenant(tenantId, teacherUserId);

    const assignment = await this.repository.assignClassTeacher(
      tenantId,
      this.requireText(dto.academic_year_id, 'Academic year ID'),
      this.requireText(dto.class_section_id, 'Class section ID'),
      teacherUserId
    );
    await this.auditMutation(tenantId, 'class_teacher_assignment', assignment?.id, 'academics.class_teacher_assigned', {
      academic_year_id: dto.academic_year_id,
      class_section_id: dto.class_section_id,
      teacher_user_id: teacherUserId,
    });
    return assignment;
  }

  archiveClassTeacher(id: string) {
    return this.repository.archiveClassTeacher(this.requireTenantId(), id);
  }

  // --- Report Card Settings ---
  getReportCardSettings() {
    return this.repository.getReportCardSettings(this.requireTenantId());
  }

  createReportCardSetting(dto: any) {
    return this.repository.createReportCardSetting(
      this.requireTenantId(),
      this.requireText(dto.name, 'Setting name'),
      dto.grading_system_id || null,
      dto.show_rank ?? true,
      dto.show_attendance ?? true
    );
  }

  archiveReportCardSetting(id: string) {
    return this.repository.archiveReportCardSetting(this.requireTenantId(), id);
  }

  private auditMutation(
    tenantId: string,
    entityType: string,
    entityId: string | null | undefined,
    action: string,
    metadata: Record<string, unknown>,
  ) {
    return this.repository.appendAuditLog({
      tenant_id: tenantId,
      entity_type: entityType,
      entity_id: entityId ?? null,
      action,
      actor_user_id: this.currentUserId(),
      metadata,
    });
  }
}
