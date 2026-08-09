import { BadRequestException, ConflictException, Injectable, UnauthorizedException, Inject, forwardRef, Optional } from '@nestjs/common';

import { RequestContextService } from '../../common/request-context/request-context.service';
import { ExamsService } from '../exams/exams.service';
import { EventPublisherService } from '../events/event-publisher.service';
import { WorkflowRepository } from '../events/repositories/workflow.repository';
import type { SupportedDomainEventName } from '../events/events.types';
import { EnterExamMarkDto } from '../exams/dto/exams.dto';
import {
  AssignTeacherDto,
  AssignStudentToClassDto,
  CreateAcademicTermDto,
  CreateAcademicYearDto,
  CreateClassSectionDto,
  CreateClassStreamDto,
  CreateClassSubjectAssignmentDto,
  UpdateClassSubjectAssignmentDto,
  CreateAcademicCalendarPeriodDto,
  UpdateAcademicCalendarPeriodDto,
  CreateClassStructureDto,
  CreateDepartmentDto,
  CreateSubjectDto,
  CreateAttendanceDto,
  CreateAssignmentDto,
  CreateResourceDto,
  CreateLessonLogDto,
  AcademicLifecycleDto,
  AcademicPolicyDto,
  CreateAcademicPolicyDto,
  AcademicRoleAppointmentDto,
  AcademicMergeDto,
  AcademicBulkLifecycleDto,
  AcademicCurriculumConfigurationDto,
  CreateAcademicCurriculumConfigurationDto,
  ReassignTeacherDto,
  AssignClassTeacherDto,
  EndAssignmentDto,
  UpdateAcademicTermDto,
  UpdateAcademicYearDto,
  UpdateClassSectionDto,
  UpdateClassStreamDto,
  UpdateDepartmentDto,
  UpdateSubjectDto,
} from './dto/academic.dto';
import { AcademicsRepository, type SetupDependencyResult } from './repositories/academics.repository';

@Injectable()
export class AcademicsService {
  constructor(
    @Inject(forwardRef(() => RequestContextService))
    private readonly requestContext: RequestContextService,
    @Inject(forwardRef(() => AcademicsRepository))
    private readonly repository: AcademicsRepository,
    @Inject(forwardRef(() => ExamsService))
    private readonly examsService: ExamsService,
    @Optional()
    private readonly eventPublisher?: EventPublisherService,
    @Optional()
    private readonly workflowRepository?: WorkflowRepository,
  ) {}

  async createAcademicYear(dto: CreateAcademicYearDto) {
    const tenantId = this.requireTenantId();
    this.requireDateRange(dto.starts_on, dto.ends_on, 'Academic year');
    await this.requireCreateNameAvailable(tenantId, 'academic_years', dto.name, 'academic year');
    let year = await this.repository.createAcademicYear({
      tenant_id: tenantId,
      created_by_user_id: this.currentUserId(),
      name: this.requireText(dto.name, 'Academic year name'),
      starts_on: dto.starts_on,
      ends_on: dto.ends_on,
      is_current: dto.is_current ?? false,
    });
    if (!year) throw new ConflictException('That academic year already exists. Open it and edit the existing record.');
    if (dto.is_current) {
      year = await this.repository.setCurrentAcademicPeriod(tenantId, 'academic-year', String(year.id)) ?? year;
    }
    await this.recordAcademicChange('academic.calendar.updated', 'academic_year', year, 'created', null, undefined);
    return year;
  }

  async createAcademicTerm(dto: CreateAcademicTermDto) {
    const tenantId = this.requireTenantId();
    this.requireDateRange(dto.starts_on, dto.ends_on, 'Academic term');
    const academicYearId = this.requireText(dto.academic_year_id, 'Academic year');
    const yearResult = await this.repository.executeSql(
      tenantId,
      `SELECT id::text, starts_on::text, ends_on::text
       FROM academic_years
       WHERE tenant_id = $1 AND id = $2::text AND COALESCE(status, 'draft') <> 'archived'
       LIMIT 1`,
      [tenantId, academicYearId],
    );
    const year = yearResult.rows[0];
    if (!year) {
      throw new BadRequestException('Select an academic year from this school.');
    }
    if (dto.starts_on < year.starts_on || dto.ends_on > year.ends_on) {
      throw new BadRequestException('Academic term dates must fall within the selected academic year.');
    }
    const overlapResult = await this.repository.executeSql(
      tenantId,
      `SELECT name
       FROM academic_terms
       WHERE tenant_id = $1
         AND academic_year_id = $2::text
         AND name <> $3
         AND COALESCE(status, 'draft') <> 'archived'
         AND starts_on <= $5::date
         AND ends_on >= $4::date
       LIMIT 1`,
      [tenantId, academicYearId, this.requireText(dto.name, 'Academic term name'), dto.starts_on, dto.ends_on],
    );
    if (overlapResult.rows[0]) {
      throw new BadRequestException(`Academic term dates overlap ${overlapResult.rows[0].name}.`);
    }
    await this.requireCreateNameAvailable(tenantId, 'academic_terms', dto.name, 'term', academicYearId);
    let term = await this.repository.createAcademicTerm({
      tenant_id: tenantId,
      created_by_user_id: this.currentUserId(),
      academic_year_id: academicYearId,
      name: this.requireText(dto.name, 'Academic term name'),
      starts_on: dto.starts_on,
      ends_on: dto.ends_on,
      is_current: dto.is_current ?? false,
      display_order: dto.display_order ?? 0,
    });
    if (!term) throw new ConflictException('That term already exists in the selected academic year. Open and edit it.');
    if (dto.is_current) {
      term = await this.repository.setCurrentAcademicPeriod(tenantId, 'academic-term', String(term.id)) ?? term;
    }
    await this.recordAcademicChange('academic.calendar.updated', 'academic_term', term, 'created', null, undefined,
      { academic_year_id: academicYearId });
    return term;
  }

  async createAcademicCalendarPeriod(dto: CreateAcademicCalendarPeriodDto) {
    const tenantId = this.requireTenantId();
    const year = await this.requireSetupRecord(tenantId, 'academic-year', dto.academic_year_id);
    const term = dto.academic_term_id
      ? await this.requireSetupRecord(tenantId, 'academic-term', dto.academic_term_id)
      : null;
    if (term && String(term.academic_year_id) !== String(year.id)) {
      throw new BadRequestException('The selected term does not belong to the selected academic year.');
    }
    this.requireDateRange(dto.starts_on, dto.ends_on, 'Academic calendar period');
    if (dto.starts_on < String(year.starts_on).slice(0, 10) || dto.ends_on > String(year.ends_on).slice(0, 10)) {
      throw new BadRequestException('Academic calendar period dates must remain inside the academic year.');
    }
    if (term && (dto.starts_on < String(term.starts_on).slice(0, 10) || dto.ends_on > String(term.ends_on).slice(0, 10))) {
      throw new BadRequestException('A term-scoped calendar period must remain inside the selected term.');
    }
    const created = await this.repository.createAcademicCalendarPeriod(tenantId, {
      ...dto, actor_user_id: this.currentUserId(), name: dto.name.trim(),
    });
    if (!created) throw new ConflictException('That calendar period already exists. Open it to edit or restore it.');
    await this.recordAcademicChange('academic.calendar.updated', 'academic_calendar_period', created,
      'created', null, dto.reason, { period_type: dto.period_type });
    return created;
  }

  async updateAcademicCalendarPeriod(id: string, dto: UpdateAcademicCalendarPeriodDto) {
    const tenantId = this.requireTenantId();
    const previous = await this.requireSetupRecord(tenantId, 'calendar-period', id);
    const academicYearId = dto.academic_year_id ?? String(previous.academic_year_id);
    const academicTermId = dto.academic_term_id === undefined
      ? (previous.academic_term_id ? String(previous.academic_term_id) : null)
      : (dto.academic_term_id?.trim() || null);
    const year = await this.requireSetupRecord(tenantId, 'academic-year', academicYearId);
    const term = academicTermId
      ? await this.requireSetupRecord(tenantId, 'academic-term', academicTermId)
      : null;
    if (term && String(term.academic_year_id) !== academicYearId) {
      throw new BadRequestException('The selected term does not belong to the selected academic year.');
    }
    const startsOn = dto.starts_on ?? String(previous.starts_on).slice(0, 10);
    const endsOn = dto.ends_on ?? String(previous.ends_on).slice(0, 10);
    this.requireDateRange(startsOn, endsOn, 'Academic calendar period');
    if (startsOn < String(year.starts_on).slice(0, 10) || endsOn > String(year.ends_on).slice(0, 10)) {
      throw new BadRequestException('Academic calendar period dates must remain inside the academic year.');
    }
    if (term && (startsOn < String(term.starts_on).slice(0, 10) || endsOn > String(term.ends_on).slice(0, 10))) {
      throw new BadRequestException('A term-scoped calendar period must remain inside the selected term.');
    }
    const updated = await this.repository.updateAcademicCalendarPeriod(tenantId, id, {
      ...dto, academic_year_id: academicYearId, academic_term_id: academicTermId,
      actor_user_id: this.currentUserId(),
    });
    this.requireUpdatedRecord(updated, 'Academic calendar period');
    await this.recordAcademicChange('academic.calendar.updated', 'academic_calendar_period', updated,
      'updated', previous, dto.reason, { date_impact_reviewed: true });
    return updated;
  }

  async createClassSubjectAssignment(dto: CreateClassSubjectAssignmentDto) {
    const tenantId = this.requireTenantId();
    const term = await this.requireSetupRecord(tenantId, 'academic-term', dto.academic_term_id);
    const classSection = await this.requireSetupRecord(tenantId, 'class-section', dto.class_section_id);
    await this.requireSetupRecord(tenantId, 'subject', dto.subject_id);
    if (String(term.academic_year_id) !== String(classSection.academic_year_id)) {
      throw new BadRequestException('The class and term must belong to the same academic year.');
    }
    if (dto.effective_from && dto.effective_to) {
      this.requireDateRange(dto.effective_from, dto.effective_to, 'Class subject offering');
    }
    const assignment = await this.repository.createClassSubjectAssignment(tenantId, {
      ...dto, actor_user_id: this.currentUserId(),
    });
    await this.recordAcademicChange('academic.subject.updated', 'class_subject_assignment', assignment,
      'assigned', null, dto.reason, { academic_term_id: dto.academic_term_id, class_section_id: dto.class_section_id });
    return assignment;
  }

  async updateClassSubjectAssignment(id: string, dto: UpdateClassSubjectAssignmentDto) {
    const tenantId = this.requireTenantId();
    const previous = await this.requireSetupRecord(tenantId, 'class-subject', id);
    const academicTermId = dto.academic_term_id ?? String(previous.academic_term_id);
    const classSectionId = dto.class_section_id ?? String(previous.class_section_id);
    const subjectId = dto.subject_id ?? String(previous.subject_id);
    const term = await this.requireSetupRecord(tenantId, 'academic-term', academicTermId);
    const classSection = await this.requireSetupRecord(tenantId, 'class-section', classSectionId);
    await this.requireSetupRecord(tenantId, 'subject', subjectId);
    if (String(term.academic_year_id) !== String(classSection.academic_year_id)) {
      throw new BadRequestException('The class and term must belong to the same academic year.');
    }
    const effectiveFrom = dto.effective_from ?? (previous.effective_from ? String(previous.effective_from).slice(0, 10) : undefined);
    const effectiveTo = dto.effective_to ?? (previous.effective_to ? String(previous.effective_to).slice(0, 10) : undefined);
    if (effectiveFrom && effectiveTo) this.requireDateRange(effectiveFrom, effectiveTo, 'Class subject offering');
    const duplicate = await this.repository.executeSql(tenantId, `
      SELECT id FROM class_subject_assignments
      WHERE tenant_id = $1 AND academic_term_id::text = $2
        AND class_section_id::text = $3 AND subject_id::text = $4
        AND id::text <> $5 LIMIT 1
    `, [tenantId, academicTermId, classSectionId, subjectId, id]);
    if (duplicate.rows[0]) throw new ConflictException('That subject is already offered to the selected class in this term.');
    const updated = await this.repository.updateClassSubjectAssignment(tenantId, id, {
      ...dto, academic_term_id: academicTermId, class_section_id: classSectionId,
      subject_id: subjectId, actor_user_id: this.currentUserId(),
    });
    this.requireUpdatedRecord(updated, 'Class subject offering');
    await this.recordAcademicChange('academic.subject.updated', 'class_subject_assignment', updated,
      'updated', previous, dto.reason);
    return updated;
  }

  async createClassSection(dto: CreateClassSectionDto) {
    const tenantId = this.requireTenantId();
    const academicYearId = this.requireText(dto.academic_year_id, 'Academic year');
    const classFormGradeName = this.requireText(dto.name, 'Class/form/grade name');
    await this.requireTenantRecord(
      tenantId,
      'academic_years',
      academicYearId,
      'Select an academic year from this school.',
    );
    if (dto.academic_level_id?.trim()) {
      await this.requireTenantRecord(
        tenantId,
        'academic_levels',
        dto.academic_level_id.trim(),
        'Select an academic level from this school.',
      );
    }
    await this.requireCreateNameAvailable(tenantId, 'class_sections', classFormGradeName, 'class', academicYearId);
    if (dto.code) await this.requireUniqueCode(tenantId, 'class_sections', dto.code, null, academicYearId);
    const classSection = await this.repository.createClassSection({
      tenant_id: tenantId,
      created_by_user_id: this.currentUserId(),
      academic_year_id: academicYearId,
      academic_level_id: dto.academic_level_id?.trim() || null,
      name: classFormGradeName,
      grade_level: classFormGradeName,
      stream: dto.stream?.trim() || null,
      custom_label: dto.custom_label?.trim() || null,
      capacity: dto.capacity ?? null,
      code: dto.code?.trim() || null,
      curriculum_model: dto.curriculum_model ?? 'Custom',
      enrolment_open: dto.enrolment_open ?? true,
    });
    if (!classSection) throw new ConflictException('That class already exists in the selected academic year.');
    await this.recordAcademicChange('academic.class.updated', 'class_section', classSection, 'created', null, undefined,
      { academic_year_id: academicYearId });
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

    await this.requireUniqueCode(tenantId, 'subjects', dto.code, null);
    const duplicateName = await this.repository.executeSql(tenantId, `
      SELECT id FROM subjects WHERE tenant_id = $1 AND lower(name) = lower($2)
        AND curriculum_model = $3 AND status <> 'archived' LIMIT 1
    `, [tenantId, dto.name.trim(), dto.curriculum_model ?? 'Custom']);
    if (duplicateName.rows[0]) {
      throw new ConflictException('A subject with that name and curriculum already exists. Open and edit it instead.');
    }

    const subject = await this.repository.createSubject({
      tenant_id: tenantId,
      created_by_user_id: this.currentUserId(),
      code: this.requireText(dto.code, 'Subject code'),
      name: this.requireText(dto.name, 'Subject name'),
      department_id: departmentId,
      abbreviation: dto.abbreviation?.trim() || null,
      curriculum_model: dto.curriculum_model ?? 'Custom',
      subject_type: dto.subject_type ?? 'academic',
      is_compulsory: dto.is_compulsory ?? true,
      is_examinable: dto.is_examinable ?? true,
      is_practical: dto.is_practical ?? false,
      is_co_curricular: dto.is_co_curricular ?? false,
    });
    if (!subject) throw new ConflictException('That subject code already exists. Open and edit the existing subject.');
    await this.recordAcademicChange('academic.subject.updated', 'subject', subject, 'created', null, undefined,
      { department_id: departmentId });
    return subject;
  }

  async assignTeacher(dto: AssignTeacherDto) {
    const tenantId = this.requireTenantId();
    const teacherUserId = this.requireText(dto.teacher_user_id, 'Teacher');
    const assignmentType = dto.assignment_type ?? 'primary';
    const isPrimary = assignmentType === 'supporting'
      ? false
      : assignmentType === 'primary'
        ? true
        : dto.is_primary ?? true;
    await this.requireActiveStaffUserInTenant(tenantId, teacherUserId);
    const termId = this.requireText(dto.academic_term_id, 'Academic term');
    const classSectionId = this.requireText(dto.class_section_id, 'Class section');
    const subjectId = this.requireText(dto.subject_id, 'Subject');
    const scope = await this.repository.executeSql(
      tenantId,
      `SELECT term.id
       FROM academic_terms term
       JOIN class_sections section
         ON section.tenant_id = term.tenant_id
        AND section.academic_year_id = term.academic_year_id
        AND section.id = $3::text
       JOIN subjects subject
         ON subject.tenant_id = term.tenant_id
        AND subject.id = $4::text
        AND COALESCE(subject.status, 'active') = 'active'
       WHERE term.tenant_id = $1 AND term.id = $2::text
       LIMIT 1`,
      [tenantId, termId, classSectionId, subjectId],
    );
    if (!scope.rows[0]) {
      throw new BadRequestException('Select a term, class, and subject that belong to the same school and academic year.');
    }
    if (dto.effective_from && dto.effective_to) {
      this.requireDateRange(dto.effective_from, dto.effective_to, 'Teacher assignment');
    }
    if (dto.stream_id) {
      const stream = await this.repository.executeSql(tenantId, `
        SELECT id FROM class_streams WHERE tenant_id = $1 AND id::text = $2
          AND class_section_id::text = $3 AND status = 'active' LIMIT 1
      `, [tenantId, dto.stream_id, classSectionId]);
      if (!stream.rows[0]) throw new BadRequestException('Select an active stream in the assigned class.');
    }
    if (dto.department_id) {
      await this.requireSetupRecord(tenantId, 'department', dto.department_id);
    }

    const existing = await this.repository.executeSql(
      tenantId,
      `SELECT id, teacher_user_id FROM teacher_subject_assignments
       WHERE tenant_id = $1 
         AND academic_term_id = $2
         AND class_section_id = $3
         AND subject_id = $4
         AND status = 'active'`,
      [tenantId, termId, classSectionId, subjectId]
    );

    const assignment = await this.repository.createTeacherAssignment({
      tenant_id: tenantId,
      created_by_user_id: this.currentUserId(),
      academic_term_id: termId,
      class_section_id: classSectionId,
      subject_id: subjectId,
      teacher_user_id: teacherUserId,
      assignment_type: assignmentType,
      is_primary: isPrimary,
      mark_entry_allowed: dto.mark_entry_allowed ?? true,
      lesson_record_allowed: dto.lesson_record_allowed ?? true,
      report_comment_allowed: dto.report_comment_allowed ?? true,
      effective_from: dto.effective_from ?? null,
      effective_to: dto.effective_to ?? null,
      reason: dto.reason?.trim() || null,
      stream_id: dto.stream_id?.trim() || null,
      department_id: dto.department_id?.trim() || null,
      curriculum_model: dto.curriculum_model?.trim() || null,
    });
    if (!assignment) throw new ConflictException('The teacher assignment could not be saved. Refresh and retry.');

    await this.auditMutation(tenantId, 'teacher_assignment', assignment.id,
      existing.rows[0] ? 'academics.teacher_subject_reassigned' : 'academics.teacher_subject_assigned', {
        academic_term_id: dto.academic_term_id,
        class_section_id: dto.class_section_id,
        subject_id: dto.subject_id,
        teacher_user_id: teacherUserId,
      }, existing.rows[0] ?? null, assignment, dto.reason);
    await this.publishAcademicChange('academic.teacher_assignment.changed', 'teacher_assignment', assignment,
      existing.rows[0] ? 'reassigned' : 'assigned', existing.rows[0] ?? null, dto.reason);
    await this.notifyAcademicAssignee(tenantId, teacherUserId, `academic-assignment:${assignment.id}:${assignment.version ?? 1}`,
      'Academic assignment updated', 'Your class and subject assignment has been updated.', assignment.id);

    return assignment;
  }

  async archiveTeacherAssignment(id: string, dto?: EndAssignmentDto) {
    const tenantId = this.requireTenantId();
    const previous = await this.repository.getSetupRecord(tenantId, 'teacher-assignment', id);
    const assignment = await this.repository.archiveTeacherAssignment(
      tenantId,
      this.requireText(id, 'Teacher assignment ID'),
      {
        effective_to: dto?.effective_to,
        reason: dto?.reason?.trim() || null,
        actor_user_id: this.currentUserId(),
      },
    );
    if (!assignment) {
      throw new BadRequestException('Teacher assignment was not found in this school');
    }
    await this.auditMutation(tenantId, 'teacher_assignment', assignment.id, 'academics.teacher_subject_unassigned', {},
      previous, assignment, dto?.reason ?? 'Assignment ended');
    await this.publishAcademicChange('academic.teacher_assignment.changed', 'teacher_assignment', assignment,
      'ended', previous, dto?.reason ?? 'Assignment ended');
    if (assignment.teacher_user_id) {
      await this.notifyAcademicAssignee(tenantId, String(assignment.teacher_user_id),
        `academic-assignment-ended:${assignment.id}:${assignment.version ?? 1}`,
        'Academic assignment ended', 'One of your class and subject assignments has ended.', assignment.id);
    }
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

    if (!['CBC', 'CBE', '8-4-4', 'International', 'Hybrid', 'Custom'].includes(normalized)) {
      throw new BadRequestException(
        'Academic system type must be CBC, CBE, 8-4-4, International, Hybrid, or Custom',
      );
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

  async updateAcademicYear(id: string, dto: UpdateAcademicYearDto) {
    const tenantId = this.requireTenantId();
    const previous = await this.requireSetupRecord(tenantId, 'academic-year', id);
    const startsOn = dto.starts_on ?? String(previous.starts_on).slice(0, 10);
    const endsOn = dto.ends_on ?? String(previous.ends_on).slice(0, 10);
    this.requireDateRange(startsOn, endsOn, 'Academic year');
    const outsideTerms = await this.repository.executeSql(tenantId, `
      SELECT COUNT(*)::integer AS count FROM academic_terms
      WHERE tenant_id = $1 AND academic_year_id::text = $2
        AND COALESCE(status, 'draft') <> 'archived'
        AND (starts_on < $3::date OR ends_on > $4::date)
    `, [tenantId, id, startsOn, endsOn]);
    if (Number(outsideTerms.rows[0]?.count ?? 0) > 0) {
      throw new BadRequestException('The new academic year dates would exclude one or more existing terms. Adjust those terms first.');
    }
    if (dto.name) await this.requireUniqueName(tenantId, 'academic_years', dto.name, id);
    let updated = await this.repository.updateAcademicYear(tenantId, id, { ...dto });
    this.requireUpdatedRecord(updated, 'Academic year');
    if (dto.is_current) {
      updated = await this.repository.setCurrentAcademicPeriod(tenantId, 'academic-year', id) ?? updated;
    }
    await this.recordAcademicChange('academic.calendar.updated', 'academic_year', updated, 'updated', previous, dto.reason);
    return updated;
  }

  archiveAcademicYear(id: string) {
    return this.manageSetupLifecycle('academic-year', id, { action: 'archive', reason: 'Archived from academic setup' });
  }

  async updateAcademicTerm(id: string, dto: UpdateAcademicTermDto) {
    const tenantId = this.requireTenantId();
    const previous = await this.requireSetupRecord(tenantId, 'academic-term', id);
    const startsOn = dto.starts_on ?? String(previous.starts_on).slice(0, 10);
    const endsOn = dto.ends_on ?? String(previous.ends_on).slice(0, 10);
    this.requireDateRange(startsOn, endsOn, 'Academic term');
    const year = await this.requireSetupRecord(tenantId, 'academic-year', String(previous.academic_year_id));
    if (startsOn < String(year.starts_on).slice(0, 10) || endsOn > String(year.ends_on).slice(0, 10)) {
      throw new BadRequestException('Academic term dates must remain inside the academic year.');
    }
    const overlap = await this.repository.executeSql(tenantId, `
      SELECT name FROM academic_terms WHERE tenant_id = $1
        AND academic_year_id::text = $2 AND id::text <> $3
        AND COALESCE(status, 'draft') <> 'archived'
        AND starts_on <= $5::date AND ends_on >= $4::date LIMIT 1
    `, [tenantId, previous.academic_year_id, id, startsOn, endsOn]);
    if (overlap.rows[0]) throw new BadRequestException(`Academic term dates overlap ${overlap.rows[0].name}.`);
    let updated = await this.repository.updateAcademicTerm(tenantId, id, { ...dto });
    this.requireUpdatedRecord(updated, 'Academic term');
    if (dto.is_current) {
      updated = await this.repository.setCurrentAcademicPeriod(tenantId, 'academic-term', id) ?? updated;
    }
    await this.recordAcademicChange('academic.calendar.updated', 'academic_term', updated, 'updated', previous, dto.reason);
    return updated;
  }

  archiveAcademicTerm(id: string) {
    return this.manageSetupLifecycle('academic-term', id, { action: 'archive', reason: 'Archived from academic setup' });
  }

  async updateClassSection(id: string, dto: UpdateClassSectionDto) {
    const tenantId = this.requireTenantId();
    const previous = await this.requireSetupRecord(tenantId, 'class-section', id);
    const targetAcademicYearId = dto.academic_year_id ?? String(previous.academic_year_id);
    const classNameChanged = dto.name !== undefined || dto.grade_level !== undefined;
    const classFormGradeName = classNameChanged
      ? this.requireText(dto.name ?? dto.grade_level ?? String(previous.name), 'Class/form/grade name')
      : String(previous.name);
    if (targetAcademicYearId !== String(previous.academic_year_id)) {
      await this.requireSetupRecord(tenantId, 'academic-year', targetAcademicYearId);
      const dependencies = await this.repository.getSetupDependencies(tenantId, 'class-section', id);
      if (dependencies.total > 0) {
        throw new ConflictException({
          message: 'This class cannot be moved to another academic year while it has linked school records.',
          dependencies,
          safe_alternatives: ['Create the class in the new year', 'Promote or transfer students through the student workflow', 'Archive the old-year class after rollover'],
        });
      }
    }
    if (dto.capacity !== undefined) {
      const placements = await this.repository.executeSql(tenantId, `
        SELECT COUNT(*)::integer AS count FROM student_class_assignments
        WHERE tenant_id = $1 AND class_section_id::text = $2 AND status = 'active'
      `, [tenantId, id]);
      const activeStudents = Number(placements.rows[0]?.count ?? 0);
      if (dto.capacity < activeStudents) {
        throw new BadRequestException(`Capacity cannot be below ${activeStudents}, the current active student count.`);
      }
    }
    if (classNameChanged || targetAcademicYearId !== String(previous.academic_year_id)) {
      const duplicate = await this.repository.executeSql(tenantId, `
        SELECT id FROM class_sections WHERE tenant_id = $1 AND academic_year_id::text = $2
          AND lower(name) = lower($3) AND id::text <> $4 LIMIT 1
      `, [tenantId, targetAcademicYearId, classFormGradeName, id]);
      if (duplicate.rows[0]) throw new BadRequestException('Another class in this academic year already uses that name.');
    }
    const targetCode = dto.code ?? previous.code;
    if (targetCode) await this.requireUniqueCode(tenantId, 'class_sections', String(targetCode), id, targetAcademicYearId);
    const updated = await this.repository.updateClassSection(tenantId, id, {
      ...dto,
      ...(classNameChanged ? { name: classFormGradeName, grade_level: classFormGradeName } : {}),
    });
    this.requireUpdatedRecord(updated, 'Class');
    await this.recordAcademicChange('academic.class.updated', 'class_section', updated,
      classNameChanged && classFormGradeName !== previous.name ? 'renamed' : 'updated', previous, dto.reason,
      { academic_year_changed: targetAcademicYearId !== String(previous.academic_year_id) });
    return updated;
  }

  archiveClassSection(id: string) {
    return this.manageSetupLifecycle('class-section', id, { action: 'archive', reason: 'Archived from academic setup' });
  }

  async updateSubject(id: string, dto: UpdateSubjectDto) {
    const tenantId = this.requireTenantId();
    const previous = await this.requireSetupRecord(tenantId, 'subject', id);
    if (dto.department_id) {
      await this.requireSetupRecord(tenantId, 'department', dto.department_id);
    }
    if (dto.code) {
      const duplicate = await this.repository.executeSql(tenantId, `
        SELECT id FROM subjects WHERE tenant_id = $1 AND lower(code) = lower($2)
          AND id::text <> $3 LIMIT 1
      `, [tenantId, dto.code.trim(), id]);
      if (duplicate.rows[0]) throw new BadRequestException('Another subject in this school already uses that code.');
    }
    if (dto.name || dto.curriculum_model) {
      const duplicate = await this.repository.executeSql(tenantId, `
        SELECT id FROM subjects WHERE tenant_id = $1 AND lower(name) = lower($2)
          AND curriculum_model = $3 AND id::text <> $4 AND status <> 'archived' LIMIT 1
      `, [tenantId, (dto.name ?? previous.name).trim(), dto.curriculum_model ?? previous.curriculum_model ?? 'Custom', id]);
      if (duplicate.rows[0]) throw new BadRequestException('Another subject with that name and curriculum already exists.');
    }
    const updated = await this.repository.updateSubject(tenantId, id, { ...dto });
    this.requireUpdatedRecord(updated, 'Subject');
    await this.recordAcademicChange('academic.subject.updated', 'subject', updated, 'updated', previous, dto.reason);
    return updated;
  }

  archiveSubject(id: string) {
    return this.manageSetupLifecycle('subject', id, { action: 'archive', reason: 'Archived from academic setup' });
  }

  async updateClassStream(id: string, dto: UpdateClassStreamDto) {
    const tenantId = this.requireTenantId();
    const previous = await this.requireSetupRecord(tenantId, 'class-stream', id);
    const targetClassId = dto.class_section_id ?? String(previous.class_section_id);
    await this.requireSetupRecord(tenantId, 'class-section', targetClassId);
    if (dto.capacity !== undefined) {
      const placements = await this.repository.executeSql(tenantId, `
        SELECT COUNT(*)::integer AS count FROM student_class_assignments
        WHERE tenant_id = $1 AND stream_id::text = $2 AND status = 'active'
      `, [tenantId, id]);
      const activeStudents = Number(placements.rows[0]?.count ?? 0);
      if (dto.capacity < activeStudents) throw new BadRequestException(`Stream capacity cannot be below ${activeStudents}.`);
    }
    if (dto.stream_teacher_user_id) {
      await this.requireActiveStaffUserInTenant(tenantId, dto.stream_teacher_user_id);
    }
    if (dto.name || dto.code) {
      const duplicate = await this.repository.executeSql(tenantId, `
        SELECT id FROM class_streams WHERE tenant_id = $1 AND class_section_id::text = $2
          AND (lower(name) = lower($3) OR ($4::text IS NOT NULL AND lower(code) = lower($4)))
          AND id::text <> $5 AND status <> 'archived' LIMIT 1
      `, [tenantId, targetClassId, (dto.name ?? previous.name).trim(), dto.code?.trim() || null, id]);
      if (duplicate.rows[0]) throw new BadRequestException('That stream name or code is already used in the selected class.');
    }
    const updated = await this.repository.updateClassStream(tenantId, id, { ...dto });
    this.requireUpdatedRecord(updated, 'Stream');
    await this.recordAcademicChange('academic.stream.updated', 'class_stream', updated, 'updated', previous, dto.reason);
    return updated;
  }

  async createClassStream(dto: CreateClassStreamDto) {
    const tenantId = this.requireTenantId();
    const classSectionId = this.requireText(dto.class_section_id, 'Class Section ID');
    await this.requireTenantRecord(
      tenantId,
      'class_sections',
      classSectionId,
      'Select a class from this school before creating a stream.',
    );
    const duplicate = await this.repository.executeSql(tenantId, `
      SELECT id FROM class_streams WHERE tenant_id = $1 AND class_section_id::text = $2
        AND (lower(name) = lower($3) OR ($4::text IS NOT NULL AND lower(code) = lower($4)))
        AND status <> 'archived' LIMIT 1
    `, [tenantId, classSectionId, dto.name.trim(), dto.code?.trim() || null]);
    if (duplicate.rows[0]) throw new ConflictException('That stream name or code is already used in this class.');
    if (dto.stream_teacher_user_id) {
      await this.requireActiveStaffUserInTenant(tenantId, dto.stream_teacher_user_id);
    }
    const stream = await this.repository.createClassStream(
      tenantId,
      classSectionId,
      this.requireText(dto.name, 'Stream Name'),
      dto.capacity,
      { code: dto.code?.trim() || null, stream_teacher_user_id: dto.stream_teacher_user_id?.trim() || null },
    );
    if (!stream) throw new ConflictException('That stream already exists. Open and edit it instead.');
    await this.recordAcademicChange('academic.stream.updated', 'class_stream', stream, 'created', null, undefined,
      { class_section_id: classSectionId });
    return stream;
  }

  listClassStreams() {
    return this.repository.listClassStreams(this.requireTenantId());
  }

  // --- Departments ---
  getDepartments() {
    return this.repository.getDepartments(this.requireTenantId());
  }

  async createDepartment(dto: CreateDepartmentDto) {
    const tenantId = this.requireTenantId();
    const hodUserId = dto.head_of_department_user_id?.trim() || null;

    if (hodUserId) {
      await this.requireActiveStaffUserInTenant(tenantId, hodUserId);
      if (dto.effective_from && dto.effective_to) this.requireDateRange(dto.effective_from, dto.effective_to, 'HOD appointment');
    }

    await this.requireCreateNameAvailable(tenantId, 'academics_departments', dto.name, 'department');
    if (dto.code) await this.requireUniqueCode(tenantId, 'academics_departments', dto.code, null);

    const department = await this.repository.createDepartment(
      tenantId,
      this.requireText(dto.name, 'Department name'),
      null,
      { code: dto.code?.trim() || null, description: dto.description?.trim() || null },
    );
    if (!department) throw new ConflictException('That department already exists. Open and edit it instead.');
    let result = department;
    if (hodUserId) {
      const appointed = await this.repository.assignDepartmentHead(tenantId, String(department.id), hodUserId, {
        actor_user_id: this.currentUserId(), appointment_type: dto.appointment_type ?? 'permanent',
        effective_from: dto.effective_from ?? null, effective_to: dto.effective_to ?? null,
        reason: dto.reason ?? 'Initial HOD appointment',
      });
      result = appointed.department ?? department;
    }
    await this.recordAcademicChange('academic.department.updated', 'academic_department', result, 'created', null,
      dto.reason, { head_of_department_user_id: hodUserId });
    return result;
  }

  async updateDepartment(id: string, dto: UpdateDepartmentDto) {
    const tenantId = this.requireTenantId();
    const previous = await this.requireSetupRecord(tenantId, 'department', id);
    const hodWasProvided = dto.head_of_department_user_id !== undefined;
    const hodUserId = dto.head_of_department_user_id?.trim() || null;
    if (hodWasProvided && hodUserId) {
      await this.requireActiveStaffUserInTenant(tenantId, hodUserId);
      if (dto.effective_from && dto.effective_to) this.requireDateRange(dto.effective_from, dto.effective_to, 'HOD appointment');
    }
    if (dto.name) await this.requireUniqueName(tenantId, 'academics_departments', dto.name, id);
    if (dto.code) await this.requireUniqueCode(tenantId, 'academics_departments', dto.code, id);
    const hodChanged = hodWasProvided
      && String(previous.head_of_department_user_id ?? '') !== String(hodUserId ?? '');
    let result: any;
    if (hodChanged) {
      try {
        const reassigned = await this.repository.assignDepartmentHead(tenantId, id, hodUserId, {
          actor_user_id: this.currentUserId(), appointment_type: dto.appointment_type ?? 'permanent',
          effective_from: dto.effective_from ?? null, effective_to: dto.effective_to ?? null,
          reason: dto.reason ?? null,
          name: dto.name?.trim() || null, code: dto.code?.trim() || null,
          description: dto.description?.trim() || null, expected_version: dto.expected_version ?? null,
        });
        result = reassigned.department;
      } catch (error) {
        if ((error as { code?: string })?.code === 'ACADEMIC_DEPARTMENT_VERSION_CONFLICT') {
          throw new ConflictException('This department changed while you were editing it. Refresh and retry.');
        }
        throw error;
      }
      if (hodUserId) {
        await this.notifyAcademicAssignee(tenantId, hodUserId, `hod-assignment:${id}:${result.version ?? 1}`,
          'Head of Department appointment', `You have been appointed to lead ${result.name}.`, id);
      }
    } else {
      result = await this.repository.updateDepartment(
        tenantId,
        this.requireText(id, 'Department ID'),
        dto.name?.trim() || null,
        previous.head_of_department_user_id ?? null,
        { code: dto.code?.trim() || null, description: dto.description?.trim() || null,
          expected_version: dto.expected_version ?? null },
      );
      if (!result) {
        throw new ConflictException('This department was not found or changed while you were editing it. Refresh and retry.');
      }
    }
    await this.recordAcademicChange(
      hodChanged ? 'academic.hod.reassigned' : 'academic.department.updated',
      'academic_department', result, hodChanged ? 'hod_reassigned' : 'updated', previous, dto.reason,
    );
    return result;
  }

  archiveDepartment(id: string) {
    return this.manageSetupLifecycle('department', id, { action: 'archive', reason: 'Archived from academic setup' });
  }

  // --- Class Teachers ---
  getClassTeachers() {
    return this.repository.getClassTeachers(this.requireTenantId());
  }

  async assignClassTeacher(dto: AssignClassTeacherDto) {
    const tenantId = this.requireTenantId();
    const teacherUserId = this.requireText(dto.teacher_user_id, 'Teacher user ID');
    await this.requireActiveStaffUserInTenant(tenantId, teacherUserId);
    const academicYearId = this.requireText(dto.academic_year_id, 'Academic year ID');
    const classSectionId = this.requireText(dto.class_section_id, 'Class section ID');
    const classResult = await this.repository.executeSql(
      tenantId,
      `SELECT id
       FROM class_sections
       WHERE tenant_id = $1 AND id = $2::text AND academic_year_id = $3::text
       LIMIT 1`,
      [tenantId, classSectionId, academicYearId],
    );
    if (!classResult.rows[0]) {
      throw new BadRequestException('Select a class and academic year that belong to this school.');
    }

    const assignment = await this.repository.assignClassTeacher(
      tenantId,
      academicYearId,
      classSectionId,
      teacherUserId,
      {
        actor_user_id: this.currentUserId(), assignment_type: dto.assignment_type ?? 'permanent',
        effective_from: dto.effective_from ?? null, effective_to: dto.effective_to ?? null,
        reason: dto.reason ?? null,
      },
    );
    await this.auditMutation(tenantId, 'class_teacher_assignment', assignment?.id, 'academics.class_teacher_assigned', {
      academic_year_id: dto.academic_year_id,
      class_section_id: dto.class_section_id,
      teacher_user_id: teacherUserId,
    }, null, assignment, dto.reason);
    await this.publishAcademicChange('academic.teacher_assignment.changed', 'class_teacher_assignment', assignment,
      'assigned', null, dto.reason);
    await this.notifyAcademicAssignee(tenantId, teacherUserId, `class-teacher:${assignment.id}:${assignment.version ?? 1}`,
      'Class teacher assignment updated', 'Your class teacher assignment has been updated.', assignment.id);
    return assignment;
  }

  async archiveClassTeacher(id: string, dto?: EndAssignmentDto) {
    const tenantId = this.requireTenantId();
    const previous = await this.repository.getSetupRecord(tenantId, 'class-teacher', id);
    const result = await this.repository.archiveClassTeacher(tenantId, id, {
      effective_to: dto?.effective_to,
      reason: dto?.reason?.trim() || null,
      actor_user_id: this.currentUserId(),
    });
    if (!result) throw new BadRequestException('Class teacher assignment was not found in this school.');
    await this.auditMutation(tenantId, 'class_teacher_assignment', result.id, 'academics.class_teacher_assignment_ended', {},
      previous, result, dto?.reason ?? 'Assignment ended');
    await this.publishAcademicChange('academic.teacher_assignment.changed', 'class_teacher_assignment', result,
      'ended', previous, dto?.reason ?? 'Assignment ended');
    return result;
  }

  listGradingSystems() {
    return this.repository.listGradingSystems(this.requireTenantId());
  }

  async createGradingSystem(dto: CreateAcademicPolicyDto) {
    const tenantId = this.requireTenantId();
    if (dto.effective_from && dto.effective_to) {
      this.requireDateRange(dto.effective_from, dto.effective_to, 'Grading policy');
    }
    await this.requireCreateNameAvailable(tenantId, 'academics_grading_systems', dto.name, 'grading policy');
    const setting = await this.repository.createGradingSystem(
      tenantId,
      this.requireText(dto.name, 'Grading system name'),
      dto.description?.trim() || null,
      { rules: dto.rules ?? [], effective_from: dto.effective_from ?? null,
        effective_to: dto.effective_to ?? null },
    );
    if (!setting) throw new ConflictException('That grading policy already exists. Open and edit it instead.');
    await this.recordAcademicChange('academic.policy.updated', 'grading_system', setting, 'created', null, dto.reason);
    return setting;
  }

  async updateGradingSystem(id: string, dto: AcademicPolicyDto) {
    const tenantId = this.requireTenantId();
    const previous = await this.requireSetupRecord(tenantId, 'grading-system', id);
    if (dto.effective_from && dto.effective_to) {
      this.requireDateRange(dto.effective_from, dto.effective_to, 'Grading policy');
    }
    if (dto.name && dto.name.trim().toLowerCase() !== String(previous.name).toLowerCase()) {
      await this.requireCreateNameAvailable(tenantId, 'academics_grading_systems', dto.name, 'grading policy');
    }
    if (previous.status === 'published' && (dto.rules || dto.effective_from || dto.effective_to)) {
      const versionedName = `${dto.name?.trim() || previous.name} v${Number(previous.version ?? 1) + 1}`;
      await this.requireCreateNameAvailable(tenantId, 'academics_grading_systems', versionedName, 'grading policy version');
      const cloned = await this.repository.createGradingSystem(tenantId, versionedName,
        dto.description?.trim() || previous.description || null, {
          rules: dto.rules ?? previous.rules ?? [], effective_from: dto.effective_from ?? null,
          effective_to: dto.effective_to ?? null, based_on_id: id,
        });
      if (!cloned) throw new ConflictException('A grading policy version with that name already exists.');
      await this.recordAcademicChange('academic.policy.updated', 'grading_system', cloned, 'versioned', previous, dto.reason,
        { based_on_id: id, historical_rules_preserved: true });
      return cloned;
    }
    const setting = await this.repository.updateGradingSystem(
      tenantId,
      this.requireText(id, 'Grading system ID'),
      dto.name?.trim() || null,
      dto.description?.trim() || null,
      { rules: dto.rules, effective_from: dto.effective_from ?? null,
        effective_to: dto.effective_to ?? null, expected_version: dto.expected_version ?? null },
    );
    if (!setting) throw new BadRequestException('Grading system was not found in this school.');
    await this.recordAcademicChange('academic.policy.updated', 'grading_system', setting, 'updated', previous, dto.reason);
    return setting;
  }

  async archiveGradingSystem(id: string) {
    return this.manageSetupLifecycle('grading-system', id, { action: 'archive', reason: 'Archived from academic setup' });
  }

  listAttendanceSettings() {
    return this.repository.listAttendanceSettings(this.requireTenantId());
  }

  async createAttendanceSetting(dto: CreateAcademicPolicyDto) {
    const tenantId = this.requireTenantId();
    await this.requireCreateNameAvailable(tenantId, 'academics_attendance_settings', dto.name, 'attendance policy');
    const setting = await this.repository.createAttendanceSetting(
      tenantId,
      this.requireText(dto.name, 'Attendance setting name'),
      dto.description?.trim() || null,
      { configuration: dto.configuration ?? {} },
    );
    if (!setting) throw new ConflictException('That attendance policy already exists. Open and edit it instead.');
    await this.recordAcademicChange('academic.policy.updated', 'attendance_setting', setting, 'created', null, dto.reason);
    return setting;
  }

  async updateAttendanceSetting(id: string, dto: AcademicPolicyDto) {
    const tenantId = this.requireTenantId();
    const previous = await this.requireSetupRecord(tenantId, 'attendance-setting', id);
    if (dto.name && dto.name.trim().toLowerCase() !== String(previous.name).toLowerCase()) {
      await this.requireCreateNameAvailable(tenantId, 'academics_attendance_settings', dto.name, 'attendance policy');
    }
    const setting = await this.repository.updateAttendanceSetting(
      tenantId,
      this.requireText(id, 'Attendance setting ID'),
      dto.name?.trim() || null,
      dto.description?.trim() || null,
      { configuration: dto.configuration, expected_version: dto.expected_version ?? null },
    );
    if (!setting) throw new BadRequestException('Attendance setting was not found in this school.');
    await this.recordAcademicChange('academic.policy.updated', 'attendance_setting', setting, 'updated', previous, dto.reason);
    return setting;
  }

  async archiveAttendanceSetting(id: string) {
    return this.manageSetupLifecycle('attendance-setting', id, { action: 'archive', reason: 'Archived from academic setup' });
  }

  // --- Report Card Settings ---
  getReportCardSettings() {
    return this.repository.getReportCardSettings(this.requireTenantId());
  }

  async createReportCardSetting(dto: CreateAcademicPolicyDto) {
    const tenantId = this.requireTenantId();
    await this.requireCreateNameAvailable(tenantId, 'academics_report_card_settings', dto.name, 'report-card policy');
    if (dto.grading_system_id) await this.requireSetupRecord(tenantId, 'grading-system', dto.grading_system_id);
    const setting = await this.repository.createReportCardSetting(
      tenantId,
      this.requireText(dto.name, 'Setting name'),
      dto.grading_system_id || null,
      dto.show_rank ?? true,
      dto.show_attendance ?? true,
      { configuration: dto.configuration ?? {} },
    );
    if (!setting) throw new ConflictException('That report-card policy already exists. Open and edit it instead.');
    await this.recordAcademicChange('academic.policy.updated', 'report_card_setting', setting, 'created', null, dto.reason);
    return setting;
  }

  async archiveReportCardSetting(id: string) {
    return this.manageSetupLifecycle('report-card-setting', id, { action: 'archive', reason: 'Archived from academic setup' });
  }

  async updateReportCardSetting(id: string, dto: AcademicPolicyDto) {
    const tenantId = this.requireTenantId();
    const previous = await this.requireSetupRecord(tenantId, 'report-card-setting', id);
    if (dto.grading_system_id) {
      await this.requireSetupRecord(tenantId, 'grading-system', String(dto.grading_system_id));
    }
    const updated = await this.repository.updateReportCardSetting(tenantId, id, { ...dto });
    this.requireUpdatedRecord(updated, 'Report-card setting');
    await this.recordAcademicChange('academic.policy.updated', 'report_card_setting', updated, 'updated', previous,
      typeof dto.reason === 'string' ? dto.reason : undefined);
    return updated;
  }

  async assignAcademicRole(dto: AcademicRoleAppointmentDto) {
    const tenantId = this.requireTenantId();
    const teacherUserId = this.requireText(dto.teacher_user_id, 'Academic role holder');
    await this.requireActiveStaffUserInTenant(tenantId, teacherUserId);
    if (dto.effective_to) this.requireDateRange(dto.effective_from, dto.effective_to, 'Academic role appointment');
    if (dto.department_id) await this.requireSetupRecord(tenantId, 'department', dto.department_id);
    if (dto.academic_year_id) await this.requireSetupRecord(tenantId, 'academic-year', dto.academic_year_id);
    if (dto.class_section_id) await this.requireSetupRecord(tenantId, 'class-section', dto.class_section_id);
    if (dto.stream_id) await this.requireSetupRecord(tenantId, 'class-stream', dto.stream_id);
    const result = await this.repository.assignAcademicRole(tenantId, {
      ...dto,
      actor_user_id: this.currentUserId(),
      reason: this.requireText(dto.reason, 'Appointment reason'),
    });
    const appointment = result.appointment as Record<string, any>;
    await this.recordAcademicChange('academic.role_assignment.changed', 'academic_role_appointment', appointment,
      result.changed_holder ? 'transferred' : 'assigned', result.previous, dto.reason, {
        role_type: dto.role_type,
        scope: { department_id: dto.department_id ?? null, academic_year_id: dto.academic_year_id ?? null,
          class_section_id: dto.class_section_id ?? null, stream_id: dto.stream_id ?? null },
      });
    await this.notifyAcademicAssignee(tenantId, teacherUserId,
      `academic-role:${appointment.id}:${appointment.version ?? 1}`,
      'Academic responsibility updated',
      `You have been assigned as ${dto.role_type.replace(/_/g, ' ')} effective ${dto.effective_from}.`,
      String(appointment.id));
    if (result.previous?.teacher_user_id && String(result.previous.teacher_user_id) !== teacherUserId) {
      await this.notifyAcademicAssignee(tenantId, String(result.previous.teacher_user_id),
        `academic-role-ended:${result.previous.id}:${appointment.id}`,
        'Academic responsibility transferred',
        `Your ${dto.role_type.replace(/_/g, ' ')} appointment ended effective ${dto.effective_from}.`,
        String(result.previous.id));
    }
    return result;
  }

  async endAcademicRole(id: string, dto: EndAssignmentDto) {
    const tenantId = this.requireTenantId();
    const previous = await this.requireSetupRecord(tenantId, 'academic-role', id);
    const ended = await this.repository.endAcademicRole(tenantId, id, {
      effective_to: dto.effective_to ?? null,
      reason: this.requireText(dto.reason, 'End reason'),
      actor_user_id: this.currentUserId(),
    });
    this.requireUpdatedRecord(ended, 'Academic role appointment');
    await this.recordAcademicChange('academic.role_assignment.changed', 'academic_role_appointment', ended,
      'ended', previous, dto.reason);
    return ended;
  }

  async createCurriculumConfiguration(dto: CreateAcademicCurriculumConfigurationDto) {
    const tenantId = this.requireTenantId();
    if (dto.effective_to) this.requireDateRange(dto.effective_from, dto.effective_to, 'Curriculum configuration');
    const duplicate = await this.repository.executeSql(tenantId, `
      SELECT id FROM academics_curriculum_configurations
      WHERE tenant_id = $1 AND lower(name) = lower($2) AND effective_from = $3::date LIMIT 1
    `, [tenantId, dto.name.trim(), dto.effective_from]);
    if (duplicate.rows[0]) throw new ConflictException('That curriculum configuration and effective date already exist.');
    const created = await this.repository.createCurriculumConfiguration(tenantId, {
      ...dto, actor_user_id: this.currentUserId(), configuration: dto.configuration ?? {},
    });
    if (!created) throw new ConflictException('That curriculum configuration already exists. Open it and create a new version if needed.');
    await this.recordAcademicChange('academic.curriculum.updated', 'curriculum_configuration', created,
      'created', null, dto.reason);
    return created;
  }

  async updateCurriculumConfiguration(id: string, dto: AcademicCurriculumConfigurationDto) {
    const tenantId = this.requireTenantId();
    const previous = await this.requireSetupRecord(tenantId, 'curriculum-configuration', id);
    const effectiveFrom = dto.effective_from ?? String(previous.effective_from).slice(0, 10);
    const effectiveTo = dto.effective_to ?? (previous.effective_to ? String(previous.effective_to).slice(0, 10) : undefined);
    if (effectiveTo) this.requireDateRange(effectiveFrom, effectiveTo, 'Curriculum configuration');
    const changesHistoricalStructure = dto.configuration !== undefined || dto.curriculum_model !== undefined ||
      dto.effective_from !== undefined || dto.effective_to !== undefined;
    if (previous.status === 'active' && changesHistoricalStructure) {
      const versionedName = `${dto.name?.trim() || previous.name} v${Number(previous.version ?? 1) + 1}`;
      const created = await this.repository.createCurriculumConfiguration(tenantId, {
        name: versionedName,
        curriculum_model: dto.curriculum_model ?? previous.curriculum_model,
        configuration: dto.configuration ?? previous.configuration ?? {},
        effective_from: effectiveFrom,
        effective_to: effectiveTo ?? null,
        status: dto.status ?? 'future',
        based_on_id: id,
        actor_user_id: this.currentUserId(),
      });
      if (!created) throw new ConflictException('A curriculum version with that name and effective date already exists.');
      await this.recordAcademicChange('academic.curriculum.updated', 'curriculum_configuration', created,
        'versioned', previous, dto.reason, { historical_configuration_preserved: true, based_on_id: id });
      return created;
    }
    const updated = await this.repository.updateCurriculumConfiguration(tenantId, id, { ...dto });
    this.requireUpdatedRecord(updated, 'Curriculum configuration');
    await this.recordAcademicChange('academic.curriculum.updated', 'curriculum_configuration', updated,
      'updated', previous, dto.reason);
    return updated;
  }

  async previewTeacherReassignment(id: string) {
    const tenantId = this.requireTenantId();
    const assignment = await this.requireSetupRecord(tenantId, 'teacher-assignment', id);
    const pending = await this.repository.getTeacherReassignmentPreview(tenantId, assignment);
    const affected = Object.values(pending).reduce((sum, value) => sum + (typeof value === 'number' ? value : 0), 0);
    return {
      assignment,
      pending_work: pending,
      historical_marks_preserved: true,
      available_transfers: ['future timetable lessons', 'draft marks', 'assignments', 'comments', 'lesson plans', 'pending approvals'],
      affected_records: affected,
      outcome: affected > 0 ? 'reassignment_required' : 'safe_to_proceed',
      warning: affected > 0
        ? 'Choose which future or draft responsibilities to transfer. Historical marks and completed work will remain unchanged.'
        : 'No pending work was found in this class, subject, and term scope.',
    };
  }

  async reassignTeacher(id: string, dto: ReassignTeacherDto) {
    const tenantId = this.requireTenantId();
    await this.requireActiveStaffUserInTenant(tenantId, dto.teacher_user_id);
    const previous = await this.requireSetupRecord(tenantId, 'teacher-assignment', id);
    const result = await this.repository.reassignTeacherAssignment(tenantId, id, {
      ...dto, actor_user_id: this.currentUserId(),
    });
    if (!result?.assignment) throw new ConflictException('The assignment is no longer active. Refresh the allocation list.');
    await this.recordAcademicChange('academic.teacher_assignment.changed', 'teacher_assignment', result.assignment,
      'transferred', previous, dto.reason, { transfer_choices: {
        future_timetable: dto.transfer_future_timetable ?? false,
        pending_marks: dto.transfer_pending_marks ?? false,
        assignments: dto.transfer_assignments ?? false,
        comments: dto.transfer_comments ?? false,
        lesson_plans: dto.transfer_lesson_plans ?? false,
        approvals: dto.transfer_pending_approvals ?? false,
      }, transferred: result.transferred ?? {}, manual_review: result.manual_review ?? [], historical_marks_preserved: true });
    await this.notifyAcademicAssignee(tenantId, dto.teacher_user_id,
      `academic-reassignment:${result.assignment.id}:1`, 'Academic assignment transferred',
      `A class and subject assignment was transferred to you effective ${dto.effective_from}.`,
      String(result.assignment.id));
    return {
      ...result,
      status: result.manual_review?.length ? 'partial_success' : 'completed',
      message: result.manual_review?.length
        ? 'The allocation and selected safe work were transferred. Review the listed items manually.'
        : 'The allocation and selected responsibilities were transferred.',
    };
  }

  async previewSetupMerge(entityType: string, sourceId: string, targetId: string) {
    const tenantId = this.requireTenantId();
    this.requireMergeType(entityType);
    if (sourceId === targetId) throw new BadRequestException('Select two different records to merge.');
    const source = await this.requireSetupRecord(tenantId, entityType, sourceId);
    const target = await this.requireSetupRecord(tenantId, entityType, targetId);
    const dependencies = await this.repository.getSetupDependencies(tenantId, entityType, sourceId);
    return {
      source, target, dependencies,
      affected_records: dependencies.total,
      historical_audit_preserved: true,
      source_will_be_archived: true,
      rollback_supported_after_commit: false,
      outcome: dependencies.total > 0 ? 'migration_required' : 'safe_to_proceed',
      warning: dependencies.total > 0
        ? 'Linked records will be moved to the surviving record in one transaction. Conflicts block the entire merge.'
        : 'The unused source will be archived and the target will remain active.',
    };
  }

  async mergeSetupRecords(entityType: string, sourceId: string, dto: AcademicMergeDto) {
    if (!dto.confirm) return this.previewSetupMerge(entityType, sourceId, dto.target_id);
    const tenantId = this.requireTenantId();
    const preview = await this.previewSetupMerge(entityType, sourceId, dto.target_id);
    let merged: any;
    try {
      merged = await this.repository.mergeSetupRecords(tenantId, entityType, sourceId, dto.target_id);
    } catch {
      throw new ConflictException('The merge would create duplicate linked records. Nothing was changed. Resolve conflicting allocations and retry.');
    }
    if (!merged) throw new BadRequestException('Both merge records must belong to this school.');
    await this.recordAcademicChange('academic.setup.merged', this.auditTypeForEntity(entityType),
      { ...merged.archived_source, id: sourceId }, 'merged', merged.source, dto.reason,
      { target_id: dto.target_id, migrated: merged.migrated, preview });
    return { ...merged, preview, message: 'Merge completed transactionally. The source was archived and linked records now use the survivor.' };
  }

  async bulkManageSetup(entityType: string, dto: AcademicBulkLifecycleDto) {
    const tenantId = this.requireTenantId();
    const reason = this.requireText(dto.reason, 'Bulk lifecycle reason');
    const ids = [...new Set(dto.ids.map((id) => this.requireText(id, 'Academic setup record ID')))];
    const dependencyPreviews = await this.repository.getBulkSetupDependencies(tenantId, entityType, ids);
    const dependencyById = new Map(dependencyPreviews.map((preview) => [preview.entity_id, preview]));
    const results: Array<Record<string, unknown>> = [];
    const batchSize = 5;
    for (let offset = 0; offset < ids.length; offset += batchSize) {
      const batch = ids.slice(offset, offset + batchSize);
      const batchResults = await Promise.all(batch.map(async (id) => {
        try {
          const result = await this.manageSetupLifecycle(entityType, id, {
            action: dto.action, reason,
          }, dependencyById.get(id));
          return { id, status: 'completed', result };
        } catch (error) {
          return { id, status: 'failed', message: error instanceof Error ? error.message : 'Action failed' };
        }
      }));
      results.push(...batchResults);
    }
    const completed = results.filter((item) => item.status === 'completed').length;
    return {
      requested: results.length, completed, failed: results.length - completed, results,
      status: completed === results.length ? 'completed' : completed === 0 ? 'failed' : 'partial_success',
    };
  }

  getSetupDependencies(entityType: string, id: string) {
    return this.repository.getSetupDependencies(this.requireTenantId(), entityType, id);
  }

  getBulkSetupDependencies(entityType: string, ids: string[]) {
    const normalizedIds = [...new Set(ids.map((id) => this.requireText(id, 'Academic setup record ID')))];
    return this.repository.getBulkSetupDependencies(this.requireTenantId(), entityType, normalizedIds);
  }

  getSetupHistory(entityType: string, id: string) {
    return this.repository.getSetupHistory(this.requireTenantId(), entityType, id);
  }

  async manageSetupLifecycle(
    entityType: string,
    id: string,
    dto: AcademicLifecycleDto,
    dependencyPreview?: SetupDependencyResult,
  ) {
    const tenantId = this.requireTenantId();
    const normalizedId = this.requireText(id, 'Academic setup record ID');
    const previous = await this.requireSetupRecord(tenantId, entityType, normalizedId);
    const reason = dto.reason?.trim() || null;
    if (['archive', 'delete'].includes(dto.action) && !reason) {
      throw new BadRequestException('A reason is required to archive or permanently delete an academic setup record.');
    }
    const dependencies = dependencyPreview
      ?? await this.repository.getSetupDependencies(tenantId, entityType, normalizedId);
    let closure: { blockers: Array<{ key: string; label: string; count: number }>; total: number; can_close: boolean } | null = null;
    if (entityType === 'academic-term' && dto.action === 'close') {
      closure = await this.repository.getTermClosureBlockers(tenantId, normalizedId);
      if (!closure.can_close) {
        throw new ConflictException({
          message: 'This term cannot be closed while academic workflows remain incomplete. Complete or publish the listed work, then retry.',
          closure,
          safe_alternatives: ['Keep the term active', 'Close mark-entry windows', 'Complete moderation', 'Publish or withdraw report cards'],
        });
      }
    }
    if (dto.action === 'delete') {
      if (!dependencies.can_permanently_delete) {
        throw new ConflictException({
          message: 'This record has linked school data and cannot be permanently deleted. Archive it instead.',
          dependencies,
        });
      }
      const deleted = await this.repository.permanentlyDeleteSetupRecord(tenantId, entityType, normalizedId);
      if (!deleted) throw new BadRequestException('Academic setup record was not found in this school.');
      await this.recordAcademicChange(this.eventNameForEntity(entityType), this.auditTypeForEntity(entityType),
        { ...deleted, version: Number(deleted.version ?? 1) + 1 }, 'deleted', previous, reason ?? undefined,
        { dependencies });
      return { record: deleted, dependencies, permanently_deleted: true };
    }
    const updated = await this.repository.applySetupLifecycle(
      tenantId, entityType, normalizedId, dto.action, this.currentUserId(), dto.expected_version,
    );
    this.requireUpdatedRecord(updated, 'Academic setup record');
    await this.recordAcademicChange(this.eventNameForEntity(entityType), this.auditTypeForEntity(entityType),
      updated, dto.action, previous, reason ?? undefined, { dependencies, closure, effective_at: dto.effective_at ?? null });
    return { record: updated, dependencies, closure, permanently_deleted: false };
  }

  private async recordAcademicChange(
    eventName: SupportedDomainEventName,
    entityType: string,
    record: Record<string, any>,
    action: string,
    previous: Record<string, unknown> | null,
    reason?: string,
    metadata: Record<string, unknown> = {},
  ) {
    const tenantId = this.requireTenantId();
    await this.auditMutation(tenantId, entityType, String(record.id), `academics.${entityType}_${action}`,
      metadata, previous, record, reason);
    await this.publishAcademicChange(eventName, entityType, record, action, previous, reason, metadata);
  }

  private async publishAcademicChange(
    eventName: SupportedDomainEventName,
    entityType: string,
    record: Record<string, any>,
    action: string,
    previous: Record<string, unknown> | null,
    reason?: string,
    metadata: Record<string, unknown> = {},
  ) {
    if (!this.eventPublisher || !record?.id) return;
    const tenantId = this.requireTenantId();
    const version = Number(record.version ?? 1);
    await this.eventPublisher.publish({
      event_key: `${eventName}:${record.id}:${version}:${action}`,
      event_name: eventName as any,
      aggregate_type: entityType,
      aggregate_id: String(record.id),
      payload: {
        tenant_id: tenantId,
        entity_type: entityType,
        entity_id: String(record.id),
        action,
        version,
        occurred_at: new Date().toISOString(),
        previous_values: previous,
        new_values: record,
        reason: reason ?? null,
        metadata,
      } as any,
    });
  }

  private async notifyAcademicAssignee(
    tenantId: string,
    userId: string,
    notificationKey: string,
    title: string,
    body: string,
    recordId: string,
  ) {
    if (!this.workflowRepository) return;
    await this.workflowRepository.createNotification({
      tenant_id: tenantId,
      notification_key: notificationKey,
      recipient_user_id: userId,
      type: 'academic_assignment',
      title,
      body,
      priority: 'normal',
      source_module: 'academics',
      source_record_id: recordId,
      metadata: { school_id: tenantId },
    });
  }

  private eventNameForEntity(entityType: string): SupportedDomainEventName {
    if (entityType === 'academic-year' || entityType === 'academic-term' || entityType === 'calendar-period') return 'academic.calendar.updated';
    if (entityType === 'class-section') return 'academic.class.updated';
    if (entityType === 'class-stream') return 'academic.stream.updated';
    if (entityType === 'department') return 'academic.department.updated';
    if (entityType === 'subject' || entityType === 'class-subject') return 'academic.subject.updated';
    if (entityType === 'curriculum-configuration') return 'academic.curriculum.updated';
    return 'academic.policy.updated';
  }

  private auditTypeForEntity(entityType: string): string {
    const map: Record<string, string> = {
      'academic-year': 'academic_year', 'academic-term': 'academic_term',
      'calendar-period': 'academic_calendar_period',
      'class-section': 'class_section', 'class-stream': 'class_stream',
      department: 'academic_department', subject: 'subject',
      'class-subject': 'class_subject_assignment',
      'grading-system': 'grading_system', 'attendance-setting': 'attendance_setting',
      'report-card-setting': 'report_card_setting',
      'curriculum-configuration': 'curriculum_configuration',
    };
    return map[entityType] ?? entityType.replace(/-/g, '_');
  }

  private auditMutation(
    tenantId: string,
    entityType: string,
    entityId: string | null | undefined,
    action: string,
    metadata: Record<string, unknown>,
    previousValues: Record<string, unknown> | null = null,
    newValues: Record<string, unknown> | null = null,
    reason?: string,
  ) {
    const store = this.requestContext.getStore();
    return this.repository.appendAuditLog({
      tenant_id: tenantId,
      entity_type: entityType,
      entity_id: entityId ?? null,
      action,
      actor_user_id: this.currentUserId(),
      actor_role: store?.role ?? null,
      previous_values: previousValues,
      new_values: newValues,
      reason: reason ?? null,
      correlation_id: store?.trace_id ?? null,
      metadata,
    });
  }

  private async requireSetupRecord(tenantId: string, entityType: string, id: string) {
    const record = await this.repository.getSetupRecord(tenantId, entityType, id);
    if (!record) throw new BadRequestException('Academic setup record was not found in this school.');
    return record as Record<string, any>;
  }

  private requireUpdatedRecord<T>(record: T | null | undefined, label: string): asserts record is T {
    if (!record) {
      throw new ConflictException(`${label} was changed by another user or no longer exists. Refresh and try again.`);
    }
  }

  private async requireUniqueName(tenantId: string, table: 'academic_years' | 'academics_departments', name: string, id: string) {
    const duplicate = await this.repository.executeSql(tenantId,
      `SELECT id FROM ${table} WHERE tenant_id = $1 AND lower(name) = lower($2)
       AND id::text <> $3 LIMIT 1`, [tenantId, name.trim(), id]);
    if (duplicate.rows[0]) throw new BadRequestException('Another academic setup record already uses that name.');
  }

  private async requireCreateNameAvailable(
    tenantId: string,
    table: 'academic_years' | 'academic_terms' | 'class_sections' | 'academics_departments' |
      'academics_grading_systems' | 'academics_attendance_settings' | 'academics_report_card_settings',
    name: string,
    label: string,
    parentId?: string,
  ) {
    const parentColumn = table === 'academic_terms' ? 'academic_year_id'
      : table === 'class_sections' ? 'academic_year_id' : null;
    const parentClause = parentColumn ? `AND ${parentColumn}::text = $3` : '';
    const duplicate = await this.repository.executeSql(tenantId, `
      SELECT id FROM ${table}
      WHERE tenant_id = $1 AND lower(name) = lower($2) ${parentClause}
      LIMIT 1
    `, parentColumn ? [tenantId, this.requireText(name, `${label} name`), parentId] : [tenantId, this.requireText(name, `${label} name`)]);
    if (duplicate.rows[0]) {
      throw new ConflictException(`That ${label} already exists. Open the existing record to edit, restore, or archive it.`);
    }
  }

  private async requireUniqueCode(
    tenantId: string,
    table: 'class_sections' | 'academics_departments' | 'subjects',
    code: string,
    id: string | null,
    parentId?: string,
  ) {
    const normalizedCode = this.requireText(code, 'Code');
    const parentClause = table === 'class_sections' && parentId ? 'AND academic_year_id::text = $4' : '';
    const duplicate = await this.repository.executeSql(tenantId, `
      SELECT id FROM ${table}
      WHERE tenant_id = $1 AND lower(code) = lower($2)
        AND ($3::text IS NULL OR id::text <> $3) ${parentClause}
      LIMIT 1
    `, table === 'class_sections' && parentId
      ? [tenantId, normalizedCode, id, parentId]
      : [tenantId, normalizedCode, id]);
    if (duplicate.rows[0]) throw new ConflictException('That code is already used by another record in this school.');
  }

  private requireDateRange(startsOn: string, endsOn: string, label: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startsOn) || !/^\d{4}-\d{2}-\d{2}$/.test(endsOn)) {
      throw new BadRequestException(`${label} dates must use YYYY-MM-DD format.`);
    }
    if (startsOn > endsOn) {
      throw new BadRequestException(`${label} end date must be on or after its start date.`);
    }
  }

  private requireMergeType(entityType: string) {
    if (!['class-section', 'class-stream', 'department', 'subject', 'grading-system'].includes(entityType)) {
      throw new BadRequestException('Merge is available for classes, streams, departments, subjects, and grading systems only.');
    }
  }

  private async requireTenantRecord(
    tenantId: string,
    table: 'academic_years' | 'academic_levels' | 'class_sections',
    id: string,
    message: string,
  ) {
    const result = await this.repository.executeSql(
      tenantId,
      `SELECT id FROM ${table} WHERE tenant_id = $1 AND id = $2::text LIMIT 1`,
      [tenantId, id],
    );
    if (!result.rows[0]) throw new BadRequestException(message);
  }
}
