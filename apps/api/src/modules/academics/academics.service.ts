import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';

import { RequestContextService } from '../../common/request-context/request-context.service';
import {
  AssignTeacherDto,
  AssignStudentToClassDto,
  CreateAcademicTermDto,
  CreateAcademicYearDto,
  CreateClassSectionDto,
  CreateClassStructureDto,
  CreateSubjectDto,
} from './dto/academic.dto';
import { AcademicsRepository } from './repositories/academics.repository';

@Injectable()
export class AcademicsService {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly repository: AcademicsRepository,
  ) {}

  createAcademicYear(dto: CreateAcademicYearDto) {
    return this.repository.createAcademicYear({
      tenant_id: this.requireTenantId(),
      created_by_user_id: this.currentUserId(),
      name: this.requireText(dto.name, 'Academic year name'),
      starts_on: dto.starts_on,
      ends_on: dto.ends_on,
    });
  }

  createAcademicTerm(dto: CreateAcademicTermDto) {
    return this.repository.createAcademicTerm({
      tenant_id: this.requireTenantId(),
      created_by_user_id: this.currentUserId(),
      academic_year_id: this.requireText(dto.academic_year_id, 'Academic year'),
      name: this.requireText(dto.name, 'Academic term name'),
      starts_on: dto.starts_on,
      ends_on: dto.ends_on,
    });
  }

  createClassSection(dto: CreateClassSectionDto) {
    return this.repository.createClassSection({
      tenant_id: this.requireTenantId(),
      created_by_user_id: this.currentUserId(),
      academic_year_id: this.requireText(dto.academic_year_id, 'Academic year'),
      academic_level_id: dto.academic_level_id?.trim() || null,
      name: this.requireText(dto.name, 'Class section name'),
      grade_level: this.requireText(dto.grade_level, 'Grade level'),
      stream: dto.stream?.trim() || null,
      custom_label: dto.custom_label?.trim() || null,
      capacity: dto.capacity ?? null,
    });
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

  createSubject(dto: CreateSubjectDto) {
    return this.repository.createSubject({
      tenant_id: this.requireTenantId(),
      created_by_user_id: this.currentUserId(),
      code: this.requireText(dto.code, 'Subject code'),
      name: this.requireText(dto.name, 'Subject name'),
    });
  }

  async assignTeacher(dto: AssignTeacherDto) {
    const tenantId = this.requireTenantId();
    const assignment = await this.repository.createTeacherAssignment({
      tenant_id: tenantId,
      created_by_user_id: this.currentUserId(),
      academic_term_id: this.requireText(dto.academic_term_id, 'Academic term'),
      class_section_id: this.requireText(dto.class_section_id, 'Class section'),
      subject_id: this.requireText(dto.subject_id, 'Subject'),
      teacher_user_id: this.requireText(dto.teacher_user_id, 'Teacher'),
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
        teacher_user_id: dto.teacher_user_id,
      },
    });

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
      entity_id: assignment.id,
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

  listTeacherAssignments(teacherUserId?: string) {
    return this.repository.listTeacherAssignments({
      tenantId: this.requireTenantId(),
      teacherUserId: teacherUserId?.trim() || undefined,
    });
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
}
