import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { AgpExecutionService } from '../../common/platform-governance/agp-execution.service';
import { PrismaService } from '../../database/prisma.service';
import { CohortTx, lockCohortSchool } from '../academics/cohort-configuration';
import { CLASS_TEACHER_APPOINTMENT_SCOPE_SQL } from '../academics/class-teacher-appointment-scope';
import { EventPublisherService } from '../events/event-publisher.service';
import { AdmissionsRepository } from './repositories/admissions.repository';
import { AdmissionsService } from './admissions.service';
import { UpdateStudentRecordDto } from './dto/update-student-record.dto';
import { parseOptionalAdmissionDate } from './admission-input';
import { updateRecordAcademics } from './student-record-academics';
import { updateRecordGuardian } from './student-record-guardian';

@Injectable()
export class StudentRecordsService {
  constructor(private readonly context: RequestContextService, private readonly prisma: PrismaService,
    private readonly admissionsRepository: AdmissionsRepository, private readonly admissions: AdmissionsService,
    private readonly events: EventPublisherService, private readonly agp: AgpExecutionService) {}

  private actor(write = false) {
    const ctx = this.context.requireStore();
    const has = (permission: string) => ctx.permissions.includes('*:*') || ctx.permissions.includes(permission);
    if (!ctx.tenant_id || !ctx.user_id || !ctx.is_authenticated || !has(write ? 'students:write' : 'students:read'))
      throw new ForbiddenException('You do not have access to student records in this school.');
    const canEdit = has('students:write') && has('admissions:write');
    if (write && !canEdit) throw new ForbiddenException('Student and admission edit permissions are required.');
    return { tenant: ctx.tenant_id, user: ctx.user_id, canEdit };
  }

  private async read(tx: CohortTx, tenant: string, id: string, lock = false) {
    const [student] = await tx.$queryRawUnsafe(`SELECT student.id::text,student.admission_number,student.first_name,student.middle_name,
      student.last_name,student.date_of_birth::text,student.gender,student.status,student.nationality,student.birth_certificate_number,
      student.upi_number,student.nemis_number,student.updated_at::text,
      COALESCE(assignment.class_section_id::text,student.current_class_id,student.metadata->>'class_section_id') AS class_section_id,
      COALESCE(assignment.stream_id::text,student.current_stream_id) AS stream_id,
      COALESCE(assignment.academic_year_id::text,student.metadata->>'academic_year_id') AS academic_year_id,
      section.name AS class_name,stream.name AS stream_name,section.curriculum_model AS curriculum,
      COALESCE(guardian.display_name,student.primary_guardian_name) AS guardian_name,
      COALESCE(guardian.phone,student.primary_guardian_phone) AS guardian_phone,
      lower(COALESCE(guardian.relationship,student.metadata->>'guardian_relationship',application.relationship)) AS guardian_relationship,
      guardian.guardian_profile_id::text,
      (SELECT COUNT(*)::int FROM student_guardians sibling WHERE sibling.tenant_id=student.tenant_id
        AND sibling.guardian_profile_id=guardian.guardian_profile_id AND sibling.status='active') AS guardian_linked_students
    FROM students student LEFT JOIN LATERAL (SELECT * FROM student_class_assignments
      WHERE tenant_id=student.tenant_id AND student_id=student.id AND status='active' ORDER BY created_at DESC LIMIT 1) assignment ON TRUE
    LEFT JOIN class_sections section ON section.tenant_id=student.tenant_id
      AND section.id::text=COALESCE(assignment.class_section_id::text,student.current_class_id,student.metadata->>'class_section_id')
    LEFT JOIN class_streams stream ON stream.tenant_id=student.tenant_id AND stream.id::text=COALESCE(assignment.stream_id::text,student.current_stream_id)
    LEFT JOIN LATERAL (SELECT * FROM student_guardians WHERE tenant_id=student.tenant_id AND student_id=student.id
      AND (is_primary OR is_primary_contact) AND status='active' ORDER BY created_at LIMIT 1) guardian ON TRUE
    LEFT JOIN LATERAL (SELECT relationship FROM admission_applications WHERE tenant_id=student.tenant_id
      AND admitted_student_id::text=student.id::text ORDER BY created_at DESC LIMIT 1) application ON TRUE
    WHERE student.tenant_id=$1 AND student.id::text=$2 AND student.deleted_at IS NULL ${lock ? 'FOR UPDATE OF student' : ''}`, tenant, id);
    if (!student) throw new NotFoundException('Student was not found in this school.');
    return student;
  }

  async get(id: string) {
    const actor = this.actor();
    return this.prisma.executeWithTenant(actor.tenant, actor.user, async tx => this.record(tx, actor.tenant, id, actor.canEdit));
  }

  private async record(tx: CohortTx, tenant: string, id: string, canEdit: boolean) {
    const student = await this.read(tx, tenant, id);
    const { role, user_id: userId } = this.context.requireStore();
    if (['teacher', 'class_teacher', 'grade_master'].includes(role ?? '')) {
      const table = role === 'teacher' ? 'teacher_subject_assignments'
        : role === 'class_teacher' ? CLASS_TEACHER_APPOINTMENT_SCOPE_SQL : 'academics_role_appointments';
      const scope = await tx.$queryRawUnsafe(`SELECT 1 FROM ${table} appointment
        WHERE appointment.tenant_id=$1 AND appointment.teacher_user_id::text=$2 AND appointment.status='active'
          AND (appointment.effective_from IS NULL OR appointment.effective_from<=CURRENT_DATE)
          AND (appointment.effective_to IS NULL OR appointment.effective_to>=CURRENT_DATE)
          AND ${role === 'grade_master' ? '(appointment.class_section_id::text=$3 OR (appointment.class_section_id IS NULL AND appointment.stream_id::text=$4))' : 'appointment.class_section_id::text=$3'}
          ${role === 'class_teacher' ? '' : 'AND (appointment.stream_id IS NULL OR appointment.stream_id::text=$4)'}
          ${role === 'grade_master' ? "AND appointment.role_type IN ('grade_master','form_master')" : ''}
        LIMIT 1`, ...[tenant, userId, student.class_section_id, ...(role === 'class_teacher' ? [] : [student.stream_id])]);
      if (!scope.length) throw new ForbiddenException('This learner is outside your assigned classes.');
    }
    const subjects = await tx.$queryRawUnsafe(`SELECT subject_id::text AS id,subject_code AS code,subject_name AS name,is_compulsory
      FROM student_subject_enrollments WHERE tenant_id=$1 AND student_id::text=$2 AND status='active' ORDER BY subject_name`, tenant, id);
    return { student, subjects, can_edit: canEdit };
  }

  async options(id: string) {
    const actor = this.actor(true);
    await this.prisma.executeWithTenant(actor.tenant, actor.user, tx => this.read(tx, actor.tenant, id));
    return this.admissionsRepository.getAdmissionFoundation(actor.tenant);
  }

  async update(id: string, dto: UpdateStudentRecordDto) {
    const actor = this.actor(true);
    // Explicit null is not a request to bypass field validation or erase known identities.
    if (Object.values(dto).some(value => value === null)) throw new BadRequestException('Use an empty optional field to clear it.');
    if (dto.date_of_birth !== undefined) {
      const date = parseOptionalAdmissionDate(dto.date_of_birth, 'Date of birth');
      if (date && date > new Date().toISOString().slice(0, 10)) throw new BadRequestException('Date of birth cannot be in the future.');
    }
    return this.agp.execute({ actionName: 'STUDENT_RECORD_UPDATED', requiredCapability: 'students:write',
      aggregateType: 'student', aggregateId: id, governanceRecordedInHandler: true,
      handler: () => this.prisma.executeWithTenant(actor.tenant, actor.user, async tx => {
        await lockCohortSchool(tx, actor.tenant);
        const previous = await this.read(tx, actor.tenant, id, true);
        if (previous.updated_at !== dto.expected_updated_at) throw new ConflictException('This student was updated by someone else. Reload the record before saving again.');
        await updateRecordAcademics(tx, actor.tenant, actor.user, previous, dto);
        await updateRecordGuardian(tx, actor.tenant, actor.user, previous, dto, this.admissions);
        const columns = ['first_name', 'middle_name', 'last_name', 'date_of_birth', 'gender', 'nationality', 'birth_certificate_number', 'upi_number', 'nemis_number'] as const;
        const values: unknown[] = [actor.tenant, id, actor.user];
        const updates = ['updated_by_user_id=$3::uuid', 'updated_at=clock_timestamp()'];
        for (const field of columns) {
          if (dto[field] === undefined) continue;
          values.push(dto[field] || (field === 'nationality' ? 'Kenyan' : null));
          updates.push(`${field}=$${values.length}${field === 'date_of_birth' ? '::date' : ''}`);
        }
        await tx.$queryRawUnsafe(`UPDATE students SET ${updates.join(',')} WHERE tenant_id=$1 AND id::text=$2`, ...values);
        await tx.$queryRawUnsafe(`UPDATE admission_applications application SET first_name=student.first_name,middle_name=student.middle_name,
          last_name=student.last_name,full_name=concat_ws(' ',student.first_name,NULLIF(student.middle_name,''),student.last_name),
          date_of_birth=student.date_of_birth,gender=student.gender,nationality=student.nationality,
          birth_certificate_number=student.birth_certificate_number,nemis_upi=COALESCE(student.upi_number,student.nemis_number),updated_at=NOW()
          FROM students student WHERE application.tenant_id=$1 AND student.tenant_id=$1 AND student.id::text=$2
            AND application.admitted_student_id::text=student.id::text`, actor.tenant, id);
        await tx.$queryRawUnsafe(`UPDATE users account SET full_name=concat_ws(' ',student.first_name,NULLIF(student.middle_name,''),student.last_name),
          display_name=concat_ws(' ',student.first_name,NULLIF(student.middle_name,''),student.last_name),updated_at=NOW()
          FROM student_portal_access access JOIN students student ON student.tenant_id=access.tenant_id AND student.id=access.student_id
          WHERE account.tenant_id=$1 AND access.tenant_id=$1 AND access.student_id::text=$2 AND account.id=access.user_id`, actor.tenant, id);
        const result = await this.record(tx, actor.tenant, id, true);
        const eventId = randomUUID();
        const changedFields = Object.keys(dto).filter(key => !['reason', 'expected_updated_at'].includes(key));
        const metadata = { changed_fields: changedFields, reason: dto.reason, previous_class_id: previous.class_section_id,
          class_id: result.student.class_section_id, subject_ids: result.subjects.map((subject: any) => subject.id) };
        await tx.$queryRawUnsafe(`INSERT INTO audit_logs (tenant_id,actor_user_id,action,resource_type,resource_id,metadata)
          VALUES ($1,$2::uuid,'student.record.updated','student',$3,$4::jsonb)`, actor.tenant, actor.user, id, JSON.stringify(metadata));
        await this.events.publish({ event_name: 'student.record.updated', event_key: `student.record.updated:${eventId}`,
          aggregate_type: 'student', aggregate_id: id, tenant_id: actor.tenant,
          payload: { tenant_id: actor.tenant, student_id: id, ...metadata } }, tx);
        return result;
      }) });
  }
}
