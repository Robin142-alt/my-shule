import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';
import { CLASS_TEACHER_APPOINTMENT_SCOPE_SQL } from '../academics/class-teacher-appointment-scope';
import { DisciplineService } from '../discipline/discipline.service';
import { SchoolOperationalEventsService } from '../events/school-operational-events.service';
import { RaiseTeacherConcernDto, ReviewTeacherSubmissionDto } from './dto/teacher-workflow.dto';

// All teacher records remain in the existing school domain tables. This service
// binds teacher access to the current allocation before invoking domain workflows.
@Injectable()
export class TeacherWorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: RequestContextService,
    private readonly discipline: DisciplineService,
    private readonly events: SchoolOperationalEventsService,
  ) {}

  private scope(write = false) {
    const ctx = this.context.requireStore();
    const permission = write ? 'teacher:write' : 'teacher:read';
    if (!ctx.is_authenticated || !ctx.tenant_id || !ctx.user_id
      || !['teacher', 'class_teacher'].includes(ctx.role ?? '')
      || !ctx.permissions.some(p => [permission, 'teacher:*', '*:*'].includes(p))) {
      throw new ForbiddenException('An authenticated teacher with the required school permission is required.');
    }
    return { tenantId: ctx.tenant_id, userId: ctx.user_id, role: ctx.role! };
  }

  async concernLearners() {
    const { tenantId, userId, role } = this.scope();
    const { rows } = await this.prisma.query(`
      SELECT DISTINCT student.id::text, student.admission_number AS "admissionNo",
        CONCAT_WS(' ', student.first_name, student.last_name) AS name,
        section.name AS "className", section.id::text AS "classId"
      FROM students student
      JOIN student_class_assignments placement ON placement.tenant_id = student.tenant_id
        AND placement.student_id::text = student.id::text AND placement.status = 'active'
      JOIN class_sections section ON section.tenant_id = placement.tenant_id AND section.id::text = placement.class_section_id::text
      WHERE student.tenant_id = $1 AND student.deleted_at IS NULL
        AND LOWER(student.status) IN ('active', 'admitted', 'enrolled')
        AND EXISTS (
          SELECT 1 FROM ${role === 'class_teacher' ? CLASS_TEACHER_APPOINTMENT_SCOPE_SQL : 'teacher_subject_assignments'} allocation
          WHERE allocation.tenant_id = placement.tenant_id AND allocation.teacher_user_id::text = $2
            AND allocation.class_section_id::text = placement.class_section_id::text
            ${role === 'class_teacher' ? 'AND allocation.is_active = TRUE' : 'AND (allocation.stream_id IS NULL OR allocation.stream_id::text = placement.stream_id::text)'}
            AND allocation.status = 'active' AND allocation.effective_from <= CURRENT_DATE
            AND (allocation.effective_to IS NULL OR allocation.effective_to >= CURRENT_DATE)
        ) ORDER BY name, "className"`, [tenantId, userId]);
    return rows;
  }

  async concernOptions() {
    const students = await this.concernLearners();
    const categories = await this.discipline.listOffenseCategories();
    return { students, categories: categories.filter(c => c.is_active && !c.is_positive).map(c => ({
      id: c.id, name: c.name, defaultSeverity: c.default_severity,
    })) };
  }

  async concerns() {
    const { tenantId, userId } = this.scope();
    const { rows } = await this.prisma.query(`
      SELECT incident.id::text, incident.incident_number AS reference,
        incident.created_at::text AS date, incident.title, incident.description,
        CONCAT_WS(' ', student.first_name, student.last_name) AS learner,
        section.name AS "className", category.name AS type, incident.severity, incident.status,
        COALESCE(NULLIF(staff.display_name, ''), 'Discipline team') AS "sentTo",
        incident.action_taken AS "actionTaken", incident.updated_at::text AS "updatedAt"
      FROM discipline_incidents incident
      JOIN students student ON student.tenant_id = incident.tenant_id AND student.id::text = incident.student_id::text
      LEFT JOIN class_sections section ON section.tenant_id = incident.tenant_id AND section.id::text = incident.class_id::text
      LEFT JOIN offense_categories category ON category.tenant_id = incident.tenant_id AND category.id = incident.offense_category_id
      LEFT JOIN users staff ON staff.id = incident.assigned_staff_id
      WHERE incident.tenant_id = $1 AND incident.reporting_staff_id::text = $2 AND incident.deleted_at IS NULL
      ORDER BY incident.created_at DESC LIMIT 500`, [tenantId, userId]);
    return rows;
  }

  async concernDetail(id: string) {
    const { tenantId, userId } = this.scope();
    const { rows } = await this.prisma.query(`
      SELECT id FROM discipline_incidents WHERE tenant_id = $1 AND id::text = $2
        AND reporting_staff_id::text = $3 AND deleted_at IS NULL`, [tenantId, id, userId]);
    if (!rows.length) throw new NotFoundException('Concern not found for this teacher and school.');
    // The domain service excludes internal-only comments for teaching roles.
    return this.discipline.getIncident(id);
  }

  async raiseConcern(dto: RaiseTeacherConcernDto) {
    const { tenantId, userId, role } = this.scope(true);
    if (!dto.title.trim() || !dto.description.trim()) throw new BadRequestException('Enter a title and description.');
    return this.prisma.withRequestTransaction(async () => {
      const student = (await this.concernLearners()).find(s => s.id === dto.studentId);
      if (!student) throw new ForbiddenException('The learner is outside your active school teaching allocation.');
      const { rows: terms } = await this.prisma.query(`
        SELECT term.id::text, term.academic_year_id::text
        FROM academic_terms term JOIN academic_years year ON year.tenant_id = term.tenant_id AND year.id = term.academic_year_id
        WHERE term.tenant_id = $1 AND term.status = 'active' AND year.status = 'active'
          AND CURRENT_DATE BETWEEN term.starts_on AND term.ends_on
        ORDER BY term.starts_on DESC LIMIT 1`, [tenantId]);
      if (!terms.length) throw new BadRequestException('School administration must activate the current academic term before a concern can be raised.');
      const result = await this.discipline.createIncident({
        student_id: dto.studentId, class_id: student.classId, academic_term_id: terms[0].id,
        academic_year_id: terms[0].academic_year_id, offense_category_id: dto.categoryId,
        title: dto.title.trim(), description: dto.description.trim(), severity: dto.severity,
        occurred_at: new Date().toISOString(), reporting_staff_id: userId,
        metadata: { source_dashboard: 'teacher', concern_reporter_role: role },
      });
      const id = result.incident.id;
      await this.events.recordSchoolOperation({
        event: { id: randomUUID(), type: 'discipline.incident_logged', module: 'discipline',
          title: 'Teacher concern raised', body: 'A teacher concern requires school follow-up.',
          entityId: id, severity: dto.severity, payload: { incident_id: id, student_id: dto.studentId } },
        notifications: [{ id: `teacher-concern-${id}`, title: 'Teacher concern raised',
          body: 'Review the reported concern in Discipline & Welfare.', audienceRoles: ['discipline_master', 'deputy_principal'],
          priority: ['high', 'critical'].includes(dto.severity) ? 'urgent' : 'normal', sourceModule: 'discipline',
          relatedModule: 'discipline', relatedEntityId: id }],
      });
      return { success: true, incidentId: id, reference: result.incident.incident_number };
    });
  }

  private async assignment(id: string, lock = false) {
    const { tenantId, userId } = this.scope();
    const { rows } = await this.prisma.query(`
      SELECT homework.* FROM academics_assignments homework
      WHERE homework.tenant_id = $1 AND homework.id::text = $2 AND homework.teacher_id::text = $3
        AND EXISTS (SELECT 1 FROM teacher_subject_assignments allocation
          WHERE allocation.tenant_id = homework.tenant_id AND allocation.teacher_user_id::text = homework.teacher_id::text
            AND allocation.class_section_id::text = homework.class_id AND allocation.subject_id::text = homework.subject_id
            AND (allocation.stream_id IS NULL OR allocation.stream_id::text = homework.stream_id)
            AND allocation.status = 'active' AND allocation.effective_from <= CURRENT_DATE
            AND (allocation.effective_to IS NULL OR allocation.effective_to >= CURRENT_DATE))
      ${lock ? 'FOR UPDATE OF homework' : ''}`, [tenantId, id, userId]);
    if (!rows.length) throw new NotFoundException('Assignment is unavailable for your active teaching allocation.');
    return rows[0];
  }

  async submissions(id: string) {
    const { tenantId } = this.scope();
    const assignment = await this.assignment(id);
    const { rows } = await this.prisma.query(`
      SELECT DISTINCT student.id::text AS "studentId", student.admission_number AS "admissionNo",
        CONCAT_WS(' ', student.first_name, student.last_name) AS name,
        submission.id::text, COALESCE(submission.status, 'missing') AS status,
        submission.submitted_at::text AS "submittedAt", submission.updated_at::text AS "updatedAt",
        submission.metadata->>'score' AS score, submission.metadata->>'feedback' AS feedback,
        submission.metadata->>'completion_mode' AS "completionMode"
      FROM students student
      JOIN student_class_assignments placement ON placement.tenant_id = student.tenant_id
        AND placement.student_id::text = student.id::text AND placement.status = 'active'
      LEFT JOIN academics_assignment_submissions submission ON submission.tenant_id = student.tenant_id
        AND submission.student_id::text = student.id::text AND submission.assignment_id::text = $2
      WHERE student.tenant_id = $1 AND student.deleted_at IS NULL
        AND placement.class_section_id::text = $3 AND ($4::text IS NULL OR placement.stream_id::text = $4)
      ORDER BY name`, [tenantId, id, assignment.class_id, assignment.stream_id]);
    return { assignment: { id: assignment.id, title: assignment.title, description: assignment.description,
      maxScore: Number(assignment.max_score), status: assignment.status }, students: rows };
  }

  async reviewSubmission(id: string, dto: ReviewTeacherSubmissionDto) {
    const { tenantId, userId, role } = this.scope(true);
    return this.prisma.withRequestTransaction(async () => {
      const homework = await this.assignment(id, true);
      if (!['published', 'open', 'active'].includes(homework.status.toLowerCase())) {
        throw new BadRequestException('This assignment is closed for submission review.');
      }
      if (dto.status === 'graded' && (dto.score == null || !Number.isFinite(dto.score) || dto.score < 0 || dto.score > Number(homework.max_score))) {
        throw new BadRequestException(`Enter a score between 0 and ${homework.max_score}.`);
      }
      if (dto.status === 'returned' && !dto.feedback?.trim()) throw new BadRequestException('Explain what the learner needs to revise.');
      const { rows: eligible } = await this.prisma.query(`
        SELECT student.id FROM students student JOIN student_class_assignments placement
          ON placement.tenant_id = student.tenant_id AND placement.student_id::text = student.id::text
        WHERE student.tenant_id = $1 AND student.id::text = $2 AND student.deleted_at IS NULL
          AND placement.class_section_id::text = $3 AND placement.status = 'active'
          AND ($4::text IS NULL OR placement.stream_id::text = $4)`,
      [tenantId, dto.studentId, homework.class_id, homework.stream_id]);
      if (!eligible.length) throw new ForbiddenException('Learner is outside this assignment class and stream.');
      const { rows: previous } = await this.prisma.query(`
        SELECT * FROM academics_assignment_submissions WHERE tenant_id = $1 AND assignment_id::text = $2 AND student_id::text = $3 FOR UPDATE`,
      [tenantId, id, dto.studentId]);
      const old = previous[0];
      if (dto.status !== 'submitted' && (!old || old.status === 'draft')) throw new BadRequestException('Record receipt of the learner work before reviewing it.');
      if (dto.status === 'submitted' && old && ['submitted', 'completed', 'graded'].includes(old.status)) {
        return { success: true, alreadyRecorded: true };
      }
      if (dto.expectedUpdatedAt && (!old || new Date(old.updated_at).getTime() !== new Date(dto.expectedUpdatedAt).getTime())) {
        throw new ConflictException('This submission changed. Refresh the list before reviewing it again.');
      }
      const eventId = randomUUID();
      const metadata = { score: dto.status === 'graded' ? dto.score : null, out_of: Number(homework.max_score),
        feedback: dto.feedback?.trim() ?? '', reviewed_by: userId, reviewed_at: new Date().toISOString(),
        ...(dto.status === 'submitted' ? { completion_mode: 'teacher_recorded_receipt' } : {}) };
      const { rows } = await this.prisma.query(`
        INSERT INTO academics_assignment_submissions(tenant_id, assignment_id, student_id, status, submitted_by_user_id, submitted_at, metadata)
        VALUES ($1, $2::uuid, $3, $4, $5::uuid, NOW(), $6::jsonb)
        ON CONFLICT (tenant_id, assignment_id, student_id) DO UPDATE SET status = EXCLUDED.status,
          metadata = academics_assignment_submissions.metadata || EXCLUDED.metadata, updated_at = NOW()
        RETURNING id::text, status`, [tenantId, id, dto.studentId, dto.status, userId, JSON.stringify(metadata)]);
      const submission = rows[0];
      await this.prisma.query(`
        INSERT INTO academic_audit_logs(school_id, tenant_id, entity_type, entity_id, action, actor_user_id, actor_role, previous_values, new_values, metadata, correlation_id)
        VALUES ($1, $1, 'assignment_submission', $2, $3, $4::uuid, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9)`,
      [tenantId, submission.id, `teacher.assignment_${dto.status}`, userId, role, JSON.stringify(old ?? {}),
        JSON.stringify({ ...submission, ...metadata }), JSON.stringify({ assignment_id: id, student_id: dto.studentId }), eventId]);
      await this.prisma.query(`
        INSERT INTO workflow_events(tenant_id, source_user_id, source_role, target_roles, event_type, entity_type, entity_id, title, message, payload, status)
        VALUES ($1, $2::uuid, $3, '[]'::jsonb, $4, 'assignment_submission', $5, 'Assignment reviewed',
          'Learner assignment review saved.', $6::jsonb, 'published')`,
      [tenantId, userId, role, `assignment.${dto.status}`, submission.id,
        JSON.stringify({ event_id: eventId, school_id: tenantId, actor_user_id: userId, actor_role: role,
          entity_type: 'assignment_submission', entity_id: submission.id, timestamp: new Date().toISOString(),
          assignment_id: id, student_id: dto.studentId, status: dto.status, source_dashboard: 'teacher', correlation_id: eventId })]);
      await this.prisma.query(`
        INSERT INTO notifications(tenant_id, notification_key, recipient_user_id, type, title, body, status, priority, source_module, source_record_id, metadata)
        SELECT DISTINCT $1, $2 || ':' || portal.user_id::text, portal.user_id, 'assignment.reviewed', 'Assignment feedback',
          $4, 'unread', 'normal', 'academics', $5, $6::jsonb
        FROM student_portal_access portal JOIN tenant_memberships member ON member.tenant_id = portal.tenant_id
          AND member.user_id = portal.user_id AND member.status = 'active'
        WHERE portal.tenant_id = $1 AND portal.student_id::text = $3 AND portal.status = 'active'
        ON CONFLICT (tenant_id, notification_key) DO NOTHING`,
      [tenantId, eventId, dto.studentId, `${homework.title}: ${dto.status === 'returned' ? 'please revise your work' : dto.status === 'graded' ? 'score and feedback are ready' : 'work received'}.`,
        id, JSON.stringify({ assignment_id: id, submission_id: submission.id, status: dto.status, ...metadata })]);
      return { success: true, submission };
    });
  }
}
