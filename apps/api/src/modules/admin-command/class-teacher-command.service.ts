import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';
import { AdminCommandOperationsService } from './admin-command-operations.service';

@Injectable()
export class ClassTeacherCommandService {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly prisma: PrismaService,
    private readonly operations: AdminCommandOperationsService,
  ) {}

  private requireScope(): { tenantId: string; userId: string; role: string } {
    const store = this.requestContext.getStore();
    const tenantId = store?.tenant_id?.trim();
    const userId = this.uuidOrNull(store?.user_id);
    if (!tenantId || store?.is_authenticated === false || !userId) {
      throw new UnauthorizedException('An authenticated class teacher account and tenant context are required');
    }
    return { tenantId, userId, role: store?.role || 'class_teacher' };
  }

  private requireUuid(value: unknown, label: string): string {
    const parsed = this.uuidOrNull(value);
    if (!parsed) throw new BadRequestException(`${label} must be a valid identifier`);
    return parsed;
  }

  private describeSmsOutboxOutcome(input: {
    queued: number;
    processing: number;
    accepted: number;
    needsReview: number;
  }): string {
    const outcomes: string[] = [];
    if (input.queued > 0) outcomes.push(`${input.queued} queued`);
    if (input.processing > 0) outcomes.push(`${input.processing} already dispatching`);
    if (input.accepted > 0) outcomes.push(`${input.accepted} already provider-accepted`);
    if (input.needsReview > 0) outcomes.push(`${input.needsReview} requiring delivery review`);
    return outcomes.length > 0 ? outcomes.join(', ') : 'no SMS records';
  }

  private async assertActiveAppointment(): Promise<{ tenantId: string; userId: string; role: string }> {
    const scope = this.requireScope();
    const result = await this.executeSql<{ id: string }>(
      `SELECT appointment.id::text
       FROM academics_class_teachers appointment
       WHERE appointment.tenant_id = $1
         AND appointment.teacher_user_id = $2::uuid
         AND appointment.is_active = TRUE
         AND LOWER(COALESCE(appointment.status, 'active')) = 'active'
         AND COALESCE(appointment.effective_from, CURRENT_DATE) <= CURRENT_DATE
         AND (appointment.effective_to IS NULL OR appointment.effective_to >= CURRENT_DATE)
       LIMIT 1`,
      [scope.tenantId, scope.userId],
    );
    if (!result.rows[0]) {
      throw new ForbiddenException('An active class-teacher appointment is required for this operation');
    }
    return scope;
  }

  private async executeSql<T = any>(query: string, params: any[] = []): Promise<{ rows: T[], rowCount: number }> {
    return this.prisma.query<T>(query, params);
  }

  async getOverview() {
    const { tenantId, userId } = this.requireScope();
    const [metrics, alerts] = await Promise.all([
      this.executeSql(`
        WITH assigned_classes AS (
          SELECT DISTINCT appointment.class_section_id::text AS class_section_id
          FROM academics_class_teachers appointment
          WHERE appointment.tenant_id::text = $1::text
            AND appointment.teacher_user_id = $2::uuid
            AND appointment.is_active = TRUE
            AND LOWER(COALESCE(appointment.status, 'active')) = 'active'
            AND COALESCE(appointment.effective_from, CURRENT_DATE) <= CURRENT_DATE
            AND (appointment.effective_to IS NULL OR appointment.effective_to >= CURRENT_DATE)
        ), assigned_students AS (
          SELECT DISTINCT student.id::text AS student_id
          FROM assigned_classes class_scope
          JOIN student_class_assignments assignment
            ON assignment.tenant_id::text = $1::text
           AND assignment.class_section_id::text = class_scope.class_section_id::text
           AND assignment.status = 'active'
          JOIN students student
            ON student.tenant_id::text = assignment.tenant_id::text
           AND student.id::text = assignment.student_id::text
          WHERE student.status IN ('active', 'enrolled')
        )
        SELECT
          (SELECT COUNT(*)::int FROM assigned_students) AS total_students,
          (SELECT COUNT(DISTINCT attendance.student_id)::int
             FROM academics_attendance attendance
             JOIN assigned_students learner ON learner.student_id::text = attendance.student_id::text
            WHERE attendance.tenant_id::text = $1::text
              AND attendance.attendance_date::date = CURRENT_DATE
              AND LOWER(attendance.status) = 'present') AS present_today,
          (SELECT COUNT(DISTINCT attendance.student_id)::int
             FROM academics_attendance attendance
             JOIN assigned_students learner ON learner.student_id::text = attendance.student_id::text
            WHERE attendance.tenant_id::text = $1::text
              AND attendance.attendance_date::date = CURRENT_DATE
              AND LOWER(attendance.status) IN ('absent', 'late')) AS absent_today,
          (SELECT COUNT(*)::int
             FROM discipline_incidents incident
             JOIN assigned_students learner ON learner.student_id::text = incident.student_id::text
            WHERE incident.tenant_id::text = $1::text
              AND LOWER(incident.status) NOT IN ('resolved', 'closed')) AS pending_discipline,
          (SELECT COUNT(*)::int
             FROM student_welfare_cases welfare
             JOIN assigned_students learner ON learner.student_id::text = welfare.student_id::text
            WHERE welfare.tenant_id::text = $1::text
              AND LOWER(welfare.status) NOT IN ('resolved', 'closed')) AS welfare_flags,
          (SELECT ROUND(AVG(mark.score), 2)
             FROM exam_marks mark
             JOIN assigned_students learner ON learner.student_id::text = mark.student_id::text
            WHERE mark.tenant_id::text = $1::text) AS mean_score
      `, [tenantId, userId]),
      this.executeSql(`
        WITH assigned_students AS (
          SELECT DISTINCT student.id::text AS student_id, CONCAT_WS(' ', student.first_name, student.last_name) AS student_name
          FROM academics_class_teachers appointment
          JOIN student_class_assignments assignment
            ON assignment.tenant_id = appointment.tenant_id
           AND assignment.class_section_id::text = appointment.class_section_id::text
           AND assignment.status = 'active'
          JOIN students student
            ON student.tenant_id = assignment.tenant_id
           AND student.id::text = assignment.student_id::text
          WHERE appointment.tenant_id = $1
            AND appointment.teacher_user_id = $2::uuid
            AND appointment.is_active = TRUE
            AND LOWER(COALESCE(appointment.status, 'active')) = 'active'
            AND COALESCE(appointment.effective_from, CURRENT_DATE) <= CURRENT_DATE
            AND (appointment.effective_to IS NULL OR appointment.effective_to >= CURRENT_DATE)
            AND student.status IN ('active', 'enrolled')
        )
        SELECT *
        FROM (
          SELECT incident.id::text, 'discipline'::text AS type, learner.student_name,
                 COALESCE(incident.description, incident.title) AS message,
                 LOWER(COALESCE(incident.severity, 'medium')) AS severity, incident.created_at::text
          FROM discipline_incidents incident
          JOIN assigned_students learner ON learner.student_id = incident.student_id::text
          WHERE incident.tenant_id = $1 AND LOWER(incident.status) NOT IN ('resolved', 'closed')
          UNION ALL
          SELECT welfare.id::text, 'welfare'::text, learner.student_name,
                 COALESCE(welfare.description, welfare.category),
                 CASE WHEN LOWER(welfare.status) = 'escalated' THEN 'high' ELSE 'medium' END,
                 welfare.created_at::text
          FROM student_welfare_cases welfare
          JOIN assigned_students learner ON learner.student_id = welfare.student_id::text
          WHERE welfare.tenant_id = $1 AND LOWER(welfare.status) NOT IN ('resolved', 'closed')
        ) active_alerts
        ORDER BY created_at DESC
        LIMIT 20
      `, [tenantId, userId]),
    ]);

    const row: any = metrics.rows[0] || {};
    return {
      metrics: {
        total_students: Number(row.total_students || 0),
        present_today: Number(row.present_today || 0),
        absent_today: Number(row.absent_today || 0),
        pending_discipline: Number(row.pending_discipline || 0),
        welfare_flags: Number(row.welfare_flags || 0),
        mean_grade: row.mean_score == null ? 'N/A' : `${Number(row.mean_score).toFixed(1)}%`,
      },
      alerts: alerts.rows,
    };
  }

  async getMyClass() {
    const { tenantId, userId } = this.requireScope();
    const res = await this.executeSql(
      `
        WITH assigned_students AS (
          SELECT DISTINCT
            student.id::text,
            student.admission_number AS admission_no,
            CONCAT_WS(' ', student.first_name, student.middle_name, student.last_name) AS full_name,
            COALESCE(student.gender, 'undisclosed') AS gender,
            section.name AS stream,
            INITCAP(student.status) AS status,
            student.tenant_id
          FROM academics_class_teachers appointment
          JOIN class_sections section
            ON section.tenant_id::text = appointment.tenant_id::text
           AND section.id::text = appointment.class_section_id::text
          JOIN student_class_assignments assignment
            ON assignment.tenant_id::text = appointment.tenant_id::text
           AND assignment.class_section_id::text = appointment.class_section_id::text
           AND assignment.status = 'active'
          JOIN students student
            ON student.tenant_id::text = assignment.tenant_id::text
           AND student.id::text = assignment.student_id::text
          WHERE appointment.tenant_id::text = $1::text
            AND appointment.teacher_user_id = $2::uuid
            AND appointment.is_active = TRUE
            AND LOWER(COALESCE(appointment.status, 'active')) = 'active'
            AND COALESCE(appointment.effective_from, CURRENT_DATE) <= CURRENT_DATE
            AND (appointment.effective_to IS NULL OR appointment.effective_to >= CURRENT_DATE)
        )
        SELECT learner.*,
          COALESCE(ROUND(100.0 * COUNT(attendance.id) FILTER (WHERE LOWER(attendance.status) = 'present')
            / NULLIF(COUNT(attendance.id), 0), 1), 0)::float AS attendance_rate,
          ROUND(AVG(mark.score), 2)::float AS mean_score
        FROM assigned_students learner
        LEFT JOIN academics_attendance attendance
          ON attendance.tenant_id::text = learner.tenant_id::text
         AND attendance.student_id::text = learner.id::text
        LEFT JOIN exam_marks mark
          ON mark.tenant_id::text = learner.tenant_id::text
         AND mark.student_id::text = learner.id::text
        GROUP BY learner.id, learner.admission_no, learner.full_name, learner.gender, learner.stream, learner.status, learner.tenant_id
        ORDER BY learner.stream, learner.full_name
      `,
      [tenantId, userId]
    );
    const students = res.rows as any[];
    return {
      metrics: {
        total_enrolled: students.length,
        boys: students.filter((student) => String(student.gender).toLowerCase() === 'male').length,
        girls: students.filter((student) => String(student.gender).toLowerCase() === 'female').length,
        active: students.filter((student) => String(student.status).toLowerCase() === 'active').length,
        suspended: students.filter((student) => String(student.status).toLowerCase() === 'suspended').length,
      },
      class_name: [...new Set(students.map((student) => String(student.stream)).filter(Boolean))].join(', '),
      students,
    };
  }

  async getLearnerProfiles() {
    const { tenantId, userId } = this.requireScope();
    const res = await this.executeSql(
      `
        WITH assigned_students AS (
          SELECT DISTINCT student.*
          FROM academics_class_teachers appointment
          JOIN student_class_assignments assignment
            ON assignment.tenant_id::text = appointment.tenant_id::text
           AND assignment.class_section_id::text = appointment.class_section_id::text
           AND assignment.status = 'active'
          JOIN students student
            ON student.tenant_id::text = assignment.tenant_id::text
           AND student.id::text = assignment.student_id::text
          WHERE appointment.tenant_id::text = $1::text
            AND appointment.teacher_user_id = $2::uuid
            AND appointment.is_active = TRUE
            AND LOWER(COALESCE(appointment.status, 'active')) = 'active'
            AND COALESCE(appointment.effective_from, CURRENT_DATE) <= CURRENT_DATE
            AND (appointment.effective_to IS NULL OR appointment.effective_to >= CURRENT_DATE)
        )
        SELECT
          student.id::text,
          student.admission_number AS admission_no,
          CONCAT_WS(' ', student.first_name, student.middle_name, student.last_name) AS full_name,
          student.gender,
          student.date_of_birth::text AS dob,
          COALESCE(guardian.display_name, student.primary_guardian_name, 'Not linked') AS parent_name,
          NULLIF(student.metadata->>'special_needs', '') AS special_needs,
          NULLIF(student.medical_notes_summary, '') AS medical_notes,
          COALESCE(attendance.attendance_rate, 0)::float AS attendance_rate,
          COALESCE(mark.mean_score, 0)::float AS mean_score,
          COALESCE(discipline.case_count, 0)::int AS discipline_cases,
          COALESCE(welfare.flag_count, 0)::int AS welfare_flags
        FROM assigned_students student
        LEFT JOIN LATERAL (
          SELECT linked.display_name
          FROM student_guardians linked
          WHERE linked.tenant_id::text = student.tenant_id::text
            AND linked.student_id::text = student.id::text
            AND linked.status = 'active'
            AND linked.user_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM tenant_memberships membership
              WHERE membership.tenant_id::text = linked.tenant_id::text
                AND membership.user_id::text = linked.user_id::text
                AND membership.status = 'active'
            )
          ORDER BY linked.is_primary DESC, linked.created_at
          LIMIT 1
        ) guardian ON TRUE
        LEFT JOIN LATERAL (
          SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE LOWER(status) = 'present') / NULLIF(COUNT(*), 0), 1) AS attendance_rate
          FROM academics_attendance
          WHERE tenant_id::text = student.tenant_id::text AND student_id::text = student.id::text
        ) attendance ON TRUE
        LEFT JOIN LATERAL (
          SELECT ROUND(AVG(score), 2) AS mean_score
          FROM exam_marks
          WHERE tenant_id::text = student.tenant_id::text AND student_id::text = student.id::text
        ) mark ON TRUE
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int AS case_count
          FROM discipline_incidents
          WHERE tenant_id::text = student.tenant_id::text AND student_id::text = student.id::text
            AND LOWER(status) NOT IN ('resolved', 'closed')
        ) discipline ON TRUE
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int AS flag_count
          FROM student_welfare_cases
          WHERE tenant_id::text = student.tenant_id::text AND student_id::text = student.id::text
            AND LOWER(status) NOT IN ('resolved', 'closed')
        ) welfare ON TRUE
        ORDER BY full_name
      `,
      [tenantId, userId]
    );
    const learners = (res.rows as any[]).map((learner) => {
      const score = Number(learner.mean_score || 0);
      const mean_grade = score >= 80 ? 'A' : score >= 70 ? 'B' : score >= 60 ? 'C' : score >= 50 ? 'D' : score > 0 ? 'E' : 'N/A';
      return { ...learner, mean_grade };
    });
    return {
      metrics: {
        total_learners: learners.length,
        special_needs_count: learners.filter((learner) => Boolean(learner.special_needs)).length,
        medical_conditions: learners.filter((learner) => Boolean(learner.medical_notes)).length,
        at_risk: learners.filter((learner) => learner.attendance_rate < 75 || learner.discipline_cases > 0 || learner.welfare_flags > 0).length,
      },
      learners,
    };
  }

  async getClassAcademics() {
    const { tenantId, userId } = this.requireScope();
    const res = await this.executeSql(
      `
        WITH assigned_classes AS (
          SELECT DISTINCT appointment.class_section_id::text AS class_section_id
          FROM academics_class_teachers appointment
          WHERE appointment.tenant_id = $1
            AND appointment.teacher_user_id = $2::uuid
            AND appointment.is_active = TRUE
            AND LOWER(COALESCE(appointment.status, 'active')) = 'active'
            AND COALESCE(appointment.effective_from, CURRENT_DATE) <= CURRENT_DATE
            AND (appointment.effective_to IS NULL OR appointment.effective_to >= CURRENT_DATE)
        ), current_term AS (
          SELECT id::text, COALESCE(name, 'Current term') AS name
          FROM academic_terms
          WHERE tenant_id = $1
          ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, starts_on DESC NULLS LAST, created_at DESC
          LIMIT 1
        )
        SELECT
          subject.id::text,
          subject.name AS subject,
          COALESCE(profile.display_name, 'Not assigned') AS teacher_name,
          ROUND(AVG(mark.score), 2)::float AS mean_score,
          MAX(mark.score)::float AS highest_score,
          MIN(mark.score)::float AS lowest_score,
          ROUND(100.0 * COUNT(*) FILTER (WHERE mark.score >= 50) / NULLIF(COUNT(*), 0), 1)::float AS pass_rate,
          'Stable'::text AS trend,
          COALESCE((SELECT name FROM current_term), 'Current term') AS term
        FROM exam_marks mark
        JOIN assigned_classes class_scope ON class_scope.class_section_id = mark.class_section_id::text
        JOIN subjects subject ON subject.tenant_id = mark.tenant_id AND subject.id::text = mark.subject_id::text
        LEFT JOIN teacher_subject_assignments teaching
          ON teaching.tenant_id = mark.tenant_id
         AND teaching.class_section_id::text = mark.class_section_id::text
         AND teaching.subject_id::text = mark.subject_id::text
         AND teaching.status = 'active'
         AND COALESCE(teaching.effective_from, CURRENT_DATE) <= CURRENT_DATE
         AND (teaching.effective_to IS NULL OR teaching.effective_to >= CURRENT_DATE)
        LEFT JOIN staff_profiles profile
          ON profile.tenant_id = teaching.tenant_id
         AND profile.user_id::text = teaching.teacher_user_id::text
         AND profile.status = 'active'
        WHERE mark.tenant_id = $1
          AND (NOT EXISTS (SELECT 1 FROM current_term) OR mark.academic_term_id::text = (SELECT id FROM current_term))
        GROUP BY subject.id, subject.name, profile.display_name
        ORDER BY subject.name
      `,
      [tenantId, userId]
    );
    const subjects = res.rows as any[];
    const classMean = subjects.length
      ? subjects.reduce((sum, subject) => sum + Number(subject.mean_score || 0), 0) / subjects.length
      : 0;
    const overallPassRate = subjects.length
      ? subjects.reduce((sum, subject) => sum + Number(subject.pass_rate || 0), 0) / subjects.length
      : 0;
    return {
      metrics: {
        class_mean: Number(classMean.toFixed(1)),
        class_position: 'Assigned classes',
        subjects_above_average: subjects.filter((subject) => Number(subject.mean_score || 0) >= classMean).length,
        subjects_below_average: subjects.filter((subject) => Number(subject.mean_score || 0) < classMean).length,
        overall_pass_rate: Number(overallPassRate.toFixed(1)),
      },
      term: subjects[0]?.term ?? 'Current term',
      subjects,
    };
  }

  async getAttendanceFollowUp() {
    const { tenantId, userId } = this.requireScope();
    const res = await this.executeSql(
      `
        WITH assigned_students AS (
          SELECT DISTINCT student.id::text, student.admission_number,
                 CONCAT_WS(' ', student.first_name, student.last_name) AS student_name
          FROM academics_class_teachers appointment
          JOIN student_class_assignments assignment
            ON assignment.tenant_id::text = appointment.tenant_id::text
           AND assignment.class_section_id::text = appointment.class_section_id::text
           AND assignment.status = 'active'
          JOIN students student ON student.tenant_id::text = assignment.tenant_id::text AND student.id::text = assignment.student_id::text
          WHERE appointment.tenant_id::text = $1::text
            AND appointment.teacher_user_id = $2::uuid
            AND appointment.is_active = TRUE
            AND LOWER(COALESCE(appointment.status, 'active')) = 'active'
            AND COALESCE(appointment.effective_from, CURRENT_DATE) <= CURRENT_DATE
            AND (appointment.effective_to IS NULL OR appointment.effective_to >= CURRENT_DATE)
        )
        SELECT
          learner.id,
          learner.student_name,
          learner.admission_number AS admission_no,
          COUNT(attendance.id)::int AS absent_days,
          MAX(attendance.attendance_date::date)::text AS last_absent_date,
          COALESCE(guardian.display_name, 'No active guardian') AS parent_name,
          COALESCE(guardian.phone, '') AS parent_phone,
          CASE
            WHEN follow_up.event_type = 'attendance.follow_up_resolved' THEN 'Resolved'
            WHEN follow_up.event_type = 'attendance.follow_up_parent_notified' THEN 'Contacted'
            ELSE 'Pending'
          END AS follow_up_status,
          NULL::text AS reason,
          follow_up.created_at::text AS follow_up_at
        FROM assigned_students learner
        JOIN academics_attendance attendance
          ON attendance.tenant_id::text = $1::text
         AND attendance.student_id::text = learner.id::text
         AND LOWER(attendance.status) IN ('absent', 'late')
         AND attendance.attendance_date::date >= CURRENT_DATE - INTERVAL '90 days'
        LEFT JOIN LATERAL (
          SELECT linked.display_name, linked.phone
          FROM student_guardians linked
          WHERE linked.tenant_id::text = $1::text
            AND linked.student_id::text = learner.id::text
            AND linked.status = 'active'
            AND linked.user_id IS NOT NULL
            AND EXISTS (SELECT 1 FROM tenant_memberships membership
              WHERE membership.tenant_id::text = linked.tenant_id::text AND membership.user_id::text = linked.user_id::text AND membership.status = 'active')
          ORDER BY linked.is_primary DESC, linked.created_at
          LIMIT 1
        ) guardian ON TRUE
        LEFT JOIN LATERAL (
          SELECT event.event_type, event.created_at
          FROM workflow_events event
          WHERE event.tenant_id::text = $1::text
            AND event.entity_type = 'student'
            AND event.entity_id::text = learner.id::text
            AND event.event_type IN ('attendance.follow_up_parent_notified', 'attendance.follow_up_resolved')
          ORDER BY event.created_at DESC
          LIMIT 1
        ) follow_up ON TRUE
        GROUP BY learner.id, learner.student_name, learner.admission_number,
                 guardian.display_name, guardian.phone, follow_up.event_type, follow_up.created_at
        ORDER BY MAX(attendance.attendance_date::date) DESC, learner.student_name
      `,
      [tenantId, userId]
    );
    const absentStudents = res.rows as any[];
    return {
      metrics: {
        total_absent_today: absentStudents.filter((student) => student.last_absent_date === new Date().toISOString().slice(0, 10)).length,
        chronic_absentees: absentStudents.filter((student) => Number(student.absent_days) >= 3).length,
        pending_follow_ups: absentStudents.filter((student) => student.follow_up_status === 'Pending').length,
        resolved_today: absentStudents.filter((student) => student.follow_up_status === 'Resolved' && String(student.follow_up_at || '').slice(0, 10) === new Date().toISOString().slice(0, 10)).length,
      },
      absent_students: absentStudents,
    };
  }

  async getDisciplineFollowUp() {
    const { tenantId, userId } = this.requireScope();
    const res = await this.executeSql(
      `
        WITH assigned_students AS (
          SELECT DISTINCT student.id::text, student.admission_number,
                 CONCAT_WS(' ', student.first_name, student.last_name) AS student_name
          FROM academics_class_teachers appointment
          JOIN student_class_assignments assignment
            ON assignment.tenant_id = appointment.tenant_id
           AND assignment.class_section_id::text = appointment.class_section_id::text
           AND assignment.status = 'active'
          JOIN students student ON student.tenant_id = assignment.tenant_id AND student.id::text = assignment.student_id::text
          WHERE appointment.tenant_id = $1 AND appointment.teacher_user_id = $2::uuid
            AND appointment.is_active = TRUE AND LOWER(COALESCE(appointment.status, 'active')) = 'active'
            AND COALESCE(appointment.effective_from, CURRENT_DATE) <= CURRENT_DATE
            AND (appointment.effective_to IS NULL OR appointment.effective_to >= CURRENT_DATE)
        )
        SELECT incident.id::text, learner.student_name, learner.admission_number AS admission_no,
               incident.title AS incident_type, COALESCE(incident.description, '') AS description,
               INITCAP(COALESCE(incident.severity, 'medium')) AS severity,
               CASE WHEN LOWER(incident.status) IN ('pending', 'reported', 'open') THEN 'Open' ELSE INITCAP(incident.status) END AS status,
               COALESCE(profile.display_name, 'School staff') AS reported_by,
               incident.created_at::text AS date,
               (SELECT COUNT(*)::int FROM workflow_events event
                 WHERE event.tenant_id = incident.tenant_id AND event.entity_type = 'discipline_incident'
                   AND event.entity_id = incident.id::text AND event.event_type = 'discipline.follow_up_added') AS follow_up_count,
               COUNT(*) OVER (PARTITION BY incident.student_id)::int AS learner_case_count
        FROM discipline_incidents incident
        JOIN assigned_students learner ON learner.id = incident.student_id::text
        LEFT JOIN staff_profiles profile ON profile.tenant_id = incident.tenant_id AND profile.user_id::text = incident.reporting_staff_id::text
        WHERE incident.tenant_id = $1
        ORDER BY incident.created_at DESC
      `,
      [tenantId, userId]
    );
    const cases = res.rows as any[];
    return {
      metrics: {
        open_cases: cases.filter((record) => record.status === 'Open').length,
        resolved_this_term: cases.filter((record) => String(record.status).toLowerCase() === 'resolved').length,
        escalated: cases.filter((record) => String(record.status).toLowerCase() === 'escalated').length,
        repeat_offenders: new Set(cases.filter((record) => Number(record.learner_case_count) > 1).map((record) => record.student_name)).size,
      },
      cases,
    };
  }

  async getWelfareNotes() {
    const { tenantId, userId } = this.requireScope();
    const res = await this.executeSql(
      `
        WITH assigned_students AS (
          SELECT DISTINCT student.id::text, student.admission_number,
                 CONCAT_WS(' ', student.first_name, student.last_name) AS student_name
          FROM academics_class_teachers appointment
          JOIN student_class_assignments assignment ON assignment.tenant_id = appointment.tenant_id
            AND assignment.class_section_id::text = appointment.class_section_id::text AND assignment.status = 'active'
          JOIN students student ON student.tenant_id = assignment.tenant_id AND student.id::text = assignment.student_id::text
          WHERE appointment.tenant_id = $1 AND appointment.teacher_user_id = $2::uuid
            AND appointment.is_active = TRUE AND LOWER(COALESCE(appointment.status, 'active')) = 'active'
            AND COALESCE(appointment.effective_from, CURRENT_DATE) <= CURRENT_DATE
            AND (appointment.effective_to IS NULL OR appointment.effective_to >= CURRENT_DATE)
        ), welfare_records AS (
          SELECT note.id::text, note.student_id::text, 'student_note'::text AS entity_type,
                 INITCAP(note.note_type) AS category, note.description AS note,
                 'Medium'::text AS severity, 'Open'::text AS base_status, note.created_at, note.follow_up_date
          FROM student_notes note JOIN assigned_students learner ON learner.id = note.student_id::text
          WHERE note.tenant_id = $1 AND note.note_type = 'welfare'
          UNION ALL
          SELECT welfare.id::text, welfare.student_id::text, 'student_welfare_case'::text,
                 INITCAP(welfare.category), COALESCE(welfare.description, ''),
                 'Medium', INITCAP(welfare.status), welfare.created_at, NULL::date
          FROM student_welfare_cases welfare JOIN assigned_students learner ON learner.id = welfare.student_id::text
          WHERE welfare.tenant_id = $1
        )
        SELECT record.id, learner.student_name, learner.admission_number AS admission_no,
               COALESCE(NULLIF(INITCAP(created.payload->>'category'), ''), record.category) AS category,
               record.note,
               COALESCE(NULLIF(INITCAP(created.payload->>'severity'), ''), record.severity) AS severity,
               CASE WHEN escalation.id IS NOT NULL THEN 'Escalated' ELSE record.base_status END AS status,
               record.created_at::text, record.follow_up_date::text
        FROM welfare_records record
        JOIN assigned_students learner ON learner.id = record.student_id
        LEFT JOIN LATERAL (
          SELECT event.payload
          FROM workflow_events event
          WHERE event.tenant_id = $1
            AND event.entity_type = record.entity_type
            AND event.entity_id = record.id
            AND event.event_type = 'welfare.note_created'
          ORDER BY event.created_at DESC
          LIMIT 1
        ) created ON TRUE
        LEFT JOIN LATERAL (
          SELECT event.id FROM workflow_events event
          WHERE event.tenant_id = $1 AND event.entity_type = record.entity_type
            AND event.entity_id = record.id AND event.event_type = 'welfare.note_escalated'
          ORDER BY event.created_at DESC LIMIT 1
        ) escalation ON TRUE
        ORDER BY record.created_at DESC
      `,
      [tenantId, userId]
    );
    const notes = res.rows as any[];
    return {
      metrics: {
        total_notes: notes.length,
        open_cases: notes.filter((note) => note.status === 'Open').length,
        escalated: notes.filter((note) => note.status === 'Escalated').length,
        resolved_this_term: notes.filter((note) => note.status === 'Resolved').length,
      },
      notes,
    };
  }

  async getParentContacts() {
    const { tenantId, userId } = this.requireScope();
    const res = await this.executeSql(
      `
        WITH assigned_students AS (
          SELECT DISTINCT student.id::text, student.admission_number,
                 CONCAT_WS(' ', student.first_name, student.last_name) AS student_name
          FROM academics_class_teachers appointment
          JOIN student_class_assignments assignment ON assignment.tenant_id = appointment.tenant_id
            AND assignment.class_section_id::text = appointment.class_section_id::text AND assignment.status = 'active'
          JOIN students student ON student.tenant_id = assignment.tenant_id AND student.id::text = assignment.student_id::text
          WHERE appointment.tenant_id = $1 AND appointment.teacher_user_id = $2::uuid
            AND appointment.is_active = TRUE AND LOWER(COALESCE(appointment.status, 'active')) = 'active'
            AND COALESCE(appointment.effective_from, CURRENT_DATE) <= CURRENT_DATE
            AND (appointment.effective_to IS NULL OR appointment.effective_to >= CURRENT_DATE)
        )
        SELECT guardian.id::text, guardian.display_name AS parent_name, COALESCE(guardian.phone, '') AS phone,
               guardian.email, learner.student_name, learner.admission_number AS admission_no,
               guardian.relationship,
               contact.last_contacted, COALESCE(contact.contact_count_term, 0)::int AS contact_count_term
        FROM assigned_students learner
        JOIN student_guardians guardian ON guardian.tenant_id = $1 AND guardian.student_id::text = learner.id::text
          AND guardian.status = 'active' AND guardian.user_id IS NOT NULL
        LEFT JOIN LATERAL (
          SELECT MAX(notification.created_at)::text AS last_contacted,
                 COUNT(*) FILTER (WHERE notification.created_at >= date_trunc('month', CURRENT_DATE))::int AS contact_count_term
          FROM notifications notification
          WHERE notification.tenant_id = guardian.tenant_id
            AND notification.recipient_guardian_id::text = guardian.id::text
            AND notification.type LIKE 'class_teacher.%'
        ) contact ON TRUE
        WHERE EXISTS (
          SELECT 1 FROM tenant_memberships membership
          WHERE membership.tenant_id = guardian.tenant_id
            AND membership.user_id::text = guardian.user_id::text
            AND membership.status = 'active'
        )
        ORDER BY guardian.display_name, learner.student_name
      `,
      [tenantId, userId]
    );
    const contacts = res.rows as any[];
    return {
      metrics: {
        total_parents: new Set(contacts.map((contact) => contact.id)).size,
        contacted_this_term: new Set(contacts.filter((contact) => Number(contact.contact_count_term) > 0).map((contact) => contact.id)).size,
        never_contacted: new Set(contacts.filter((contact) => Number(contact.contact_count_term) === 0).map((contact) => contact.id)).size,
        with_email: new Set(contacts.filter((contact) => Boolean(contact.email)).map((contact) => contact.id)).size,
      },
      contacts,
    };
  }

  async getReportComments() {
    const { tenantId, userId } = this.requireScope();
    const res = await this.executeSql(
      `
        WITH current_term AS (
          SELECT id::text, COALESCE(name, 'Current term') AS name
          FROM academic_terms
          WHERE tenant_id = $1
          ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, starts_on DESC NULLS LAST, created_at DESC
          LIMIT 1
        ),
        class_students AS (
          SELECT
            student.id,
            student.admission_number,
            CONCAT_WS(' ', student.first_name, student.last_name) AS student_name,
            assignment.class_section_id::text
          FROM academics_class_teachers appointment
          JOIN student_class_assignments assignment
            ON assignment.tenant_id = appointment.tenant_id
           AND assignment.class_section_id::text = appointment.class_section_id::text
           AND assignment.status = 'active'
          JOIN students student
            ON student.tenant_id = assignment.tenant_id
           AND student.id::text = assignment.student_id::text
          WHERE appointment.tenant_id = $1
            AND appointment.teacher_user_id = $2::uuid
            AND appointment.is_active = TRUE
            AND LOWER(COALESCE(appointment.status, 'active')) = 'active'
            AND COALESCE(appointment.effective_from, CURRENT_DATE) <= CURRENT_DATE
            AND (appointment.effective_to IS NULL OR appointment.effective_to >= CURRENT_DATE)
            AND student.status IN ('active', 'enrolled')
        ),
        latest_marks AS (
          SELECT mark.student_id::text, AVG(mark.score)::numeric(8,2) AS mean_score
          FROM exam_marks mark
          WHERE mark.tenant_id = $1
            AND (NOT EXISTS (SELECT 1 FROM current_term) OR mark.academic_term_id::text = (SELECT id FROM current_term))
          GROUP BY mark.student_id
        )
        SELECT
          class_students.id::text,
          class_students.id::text AS student_id,
          class_students.student_name,
          class_students.admission_number AS admission_no,
          COALESCE(latest_marks.mean_score::text, 'N/A') AS mean_grade,
          ROW_NUMBER() OVER (ORDER BY latest_marks.mean_score DESC NULLS LAST, class_students.student_name ASC)::int AS class_position,
          COALESCE(comment.final_comment, '') AS comment,
          CASE
            WHEN comment.comment_status = 'submitted' THEN 'Submitted'
            WHEN COALESCE(comment.final_comment, '') <> '' THEN 'Written'
            ELSE 'Pending'
          END AS status,
          COALESCE((SELECT name FROM current_term), 'Current term') AS term,
          'Class report comments' AS exam_name
        FROM class_students
        LEFT JOIN latest_marks ON latest_marks.student_id = class_students.id::text
        LEFT JOIN LATERAL (
          SELECT saved.final_comment, saved.comment_status
          FROM report_card_comments saved
          WHERE saved.tenant_id = $1
            AND saved.student_id::text = class_students.id::text
            AND saved.class_section_id::text = class_students.class_section_id::text
            AND (NOT EXISTS (SELECT 1 FROM current_term) OR saved.academic_term_id::text = (SELECT id FROM current_term))
          ORDER BY saved.updated_at DESC, saved.created_at DESC
          LIMIT 1
        ) comment ON TRUE
        ORDER BY class_position ASC, class_students.student_name ASC
      `,
      [tenantId, userId]
    );
    const comments = res.rows;
    const submitted = comments.filter((row: any) => row.status === 'Submitted').length;
    const written = comments.filter((row: any) => row.status === 'Written' || row.status === 'Submitted').length;
    return {
      metrics: {
        total_students: comments.length,
        comments_written: written,
        comments_pending: Math.max(comments.length - written, 0),
        submitted,
      },
      term: comments[0]?.term ?? 'Current term',
      exam_name: comments[0]?.exam_name ?? 'Class report comments',
      comments,
    };
  }

  async submitAllComments(dto: any) {
    const { tenantId, userId } = this.requireScope();
    const pending = await this.operations.readSql<{ learner_count: number; pending_count: number }>(
      `
        WITH current_term AS (
          SELECT id::text FROM academic_terms WHERE tenant_id = $1
          ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, starts_on DESC NULLS LAST, created_at DESC LIMIT 1
        ),
        class_students AS (
          SELECT student.id, assignment.class_section_id
          FROM academics_class_teachers appointment
          JOIN student_class_assignments assignment
            ON assignment.tenant_id = appointment.tenant_id
           AND assignment.class_section_id::text = appointment.class_section_id::text
           AND assignment.status = 'active'
          JOIN students student
            ON student.tenant_id = assignment.tenant_id
           AND student.id::text = assignment.student_id::text
          WHERE appointment.tenant_id = $1
            AND appointment.teacher_user_id = $2::uuid
            AND appointment.is_active = TRUE
            AND LOWER(COALESCE(appointment.status, 'active')) = 'active'
            AND COALESCE(appointment.effective_from, CURRENT_DATE) <= CURRENT_DATE
            AND (appointment.effective_to IS NULL OR appointment.effective_to >= CURRENT_DATE)
            AND student.status IN ('active', 'enrolled')
        )
        SELECT COUNT(*)::int AS learner_count,
               COUNT(*) FILTER (WHERE COALESCE(comment.final_comment, '') = '')::int AS pending_count
        FROM class_students
        LEFT JOIN LATERAL (
          SELECT saved.final_comment
          FROM report_card_comments saved
          WHERE saved.tenant_id = $1
            AND saved.student_id::text = class_students.id::text
            AND saved.class_section_id::text = class_students.class_section_id::text
            AND saved.academic_term_id::text = (SELECT id FROM current_term)
          ORDER BY saved.updated_at DESC LIMIT 1
        ) comment ON TRUE
      `,
      [tenantId, userId],
    );
    if ((pending.rows[0]?.learner_count ?? 0) === 0) {
      throw new ForbiddenException('No active learners are available within this class-teacher appointment.');
    }
    if ((pending.rows[0]?.pending_count ?? 0) > 0) {
      throw new BadRequestException('All class learners must have comments before submission.');
    }

    const result = await this.operations.writeSql(
      `
        WITH current_term AS (
          SELECT id::text FROM academic_terms WHERE tenant_id = $1
          ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, starts_on DESC NULLS LAST, created_at DESC LIMIT 1
        ), assigned_students AS (
          SELECT student.id::text AS student_id, assignment.class_section_id::text
          FROM academics_class_teachers appointment
          JOIN student_class_assignments assignment ON assignment.tenant_id = appointment.tenant_id
            AND assignment.class_section_id::text = appointment.class_section_id::text AND assignment.status = 'active'
          JOIN students student ON student.tenant_id = assignment.tenant_id AND student.id::text = assignment.student_id::text
          WHERE appointment.tenant_id = $1 AND appointment.teacher_user_id = $2::uuid
            AND appointment.is_active = TRUE AND LOWER(COALESCE(appointment.status, 'active')) = 'active'
            AND COALESCE(appointment.effective_from, CURRENT_DATE) <= CURRENT_DATE
            AND (appointment.effective_to IS NULL OR appointment.effective_to >= CURRENT_DATE)
        )
        UPDATE report_card_comments comment
        SET comment_status = 'submitted',
            updated_at = NOW()
        FROM assigned_students learner, current_term
        WHERE comment.tenant_id = $1
          AND comment.student_id::text = learner.student_id
          AND comment.class_section_id::text = learner.class_section_id
          AND comment.academic_term_id::text = current_term.id
          AND COALESCE(comment.final_comment, '') <> ''
        RETURNING comment.id::text, comment.student_id::text
      `,
      [tenantId, userId],
    );
    await this.operations.recordAudit(tenantId, 'class_teacher.report_comments_submitted', 'report_card_comments', null, {
      submitted_count: result.rowCount,
      term: dto?.term,
      exam: dto?.exam,
    }, userId);
    await this.operations.notifyRoles(tenantId, {
      key: `class-teacher-comments-submitted-${Date.now()}`,
      type: 'class_teacher.report_comments_submitted',
      title: 'Class teacher comments submitted',
      body: `${result.rowCount} report-card comment(s) were submitted for review.`,
      targetRoles: ['exams_manager', 'dean_academics', 'principal'],
      metadata: { submitted_count: result.rowCount, term: dto?.term, exam: dto?.exam },
    });
    return { success: true, message: 'Comments submitted for review', submittedCount: result.rowCount };
  }

  async saveReportComment(studentId: string, dto: any) {
    const { tenantId, userId } = this.requireScope();
    const canonicalStudentId = this.requireUuid(studentId, 'Learner');
    const comment = this.operations.requiredText(dto?.comment ?? dto?.final_comment, 'Comment');
    const result = await this.operations.writeSql(
      `
        WITH target_student AS (
          SELECT student.id, assignment.class_section_id
          FROM students student
          JOIN student_class_assignments assignment
            ON assignment.tenant_id = student.tenant_id
           AND assignment.student_id = student.id
           AND assignment.status = 'active'
          JOIN academics_class_teachers appointment
            ON appointment.tenant_id = assignment.tenant_id
           AND appointment.class_section_id::text = assignment.class_section_id::text
          WHERE student.tenant_id = $1
            AND student.id::text = $2::uuid::text
            AND appointment.teacher_user_id = $3::uuid
            AND appointment.is_active = TRUE
            AND LOWER(COALESCE(appointment.status, 'active')) = 'active'
            AND COALESCE(appointment.effective_from, CURRENT_DATE) <= CURRENT_DATE
            AND (appointment.effective_to IS NULL OR appointment.effective_to >= CURRENT_DATE)
          LIMIT 1
        ),
        current_term AS (
          SELECT id
          FROM academic_terms
          WHERE tenant_id = $1
          ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, starts_on DESC NULLS LAST, created_at DESC
          LIMIT 1
        ),
        updated AS (
          UPDATE report_card_comments comment
          SET final_comment = $4,
              comment_status = 'draft',
              created_by_user_id = COALESCE(comment.created_by_user_id, $3::uuid),
              updated_at = NOW()
          FROM target_student, current_term
          WHERE comment.tenant_id = $1
            AND comment.student_id = target_student.id
            AND comment.academic_term_id::text = current_term.id::text
            AND comment.class_section_id::text = target_student.class_section_id::text
          RETURNING comment.*
        ),
        inserted AS (
          INSERT INTO report_card_comments (
            tenant_id, student_id, academic_term_id, class_section_id, final_comment, comment_status, created_by_user_id
          )
          SELECT $1, target_student.id, current_term.id, target_student.class_section_id, $4, 'draft', $3::uuid
          FROM target_student, current_term
          WHERE NOT EXISTS (SELECT 1 FROM updated)
          RETURNING *
        )
        SELECT * FROM updated
        UNION ALL
        SELECT * FROM inserted
      `,
      [tenantId, canonicalStudentId, userId, comment],
    );
    const saved = result.rows[0];
    if (!saved) {
      throw new BadRequestException('Student, active class assignment, or academic term was not found for this school.');
    }
    await this.operations.recordAudit(tenantId, 'class_teacher.report_comment_saved', 'report_card_comment', saved.id, { studentId: canonicalStudentId }, userId);
    return { success: true, message: 'Report comment saved', comment: saved };
  }

  async getReports() {
    const { tenantId, userId } = await this.assertActiveAppointment();
    const result = await this.operations.readSql(
      `SELECT id::text, snapshot_id AS "snapshotId", title AS "reportName", created_at::text AS "generatedDate", format AS type
       FROM report_snapshots
       WHERE tenant_id = $1 AND module = 'class-teacher-command' AND generated_by_user_id::text = $2
       ORDER BY created_at DESC LIMIT 50`,
      [tenantId, userId],
    );
    const reports = result.rows as any[];
    return {
      metrics: {
        total_reports: reports.length,
        generated_this_term: reports.length,
        pending: 0,
      },
      available_types: ['Academic Analysis', 'Discipline Report', 'Class Register', 'Welfare Report'],
      reports: reports.map((report: any) => ({
        id: report.id,
        report_name: report.reportName,
        type: report.type,
        term: 'Current term',
        generated_at: report.generatedDate,
        status: 'Ready',
        download_url: `/api/admin-command/class-teacher/reports/${encodeURIComponent(String(report.snapshotId || report.id))}/download`,
      })),
    };
  }

  async downloadReport(snapshotId: string) {
    const { tenantId, userId } = await this.assertActiveAppointment();
    const snapshotKey = this.operations.requiredText(snapshotId, 'Report snapshot');
    const result = await this.operations.readSql(
      `
        SELECT
          snapshot_id,
          title,
          format,
          artifact,
          manifest,
          manifest_checksum_sha256,
          created_at::text
        FROM report_snapshots
        WHERE tenant_id = $1
          AND snapshot_id = $2
          AND module = 'class-teacher-command'
          AND generated_by_user_id::text = $3
        LIMIT 1
      `,
      [tenantId, snapshotKey, userId],
    );
    const snapshot = result.rows[0];
    if (!snapshot) {
      throw new BadRequestException('Class-teacher report snapshot was not found for this school.');
    }
    return snapshot;
  }

  async generateReport(dto: any) {
    const { tenantId, userId } = await this.assertActiveAppointment();
    const [overview, myClass, learnerProfiles, academics, discipline, welfare, parentContacts, comments] = await Promise.all([
      this.getOverview(),
      this.getMyClass(),
      this.getLearnerProfiles(),
      this.getClassAcademics(),
      this.getDisciplineFollowUp(),
      this.getWelfareNotes(),
      this.getParentContacts(),
      this.getReportComments(),
    ]);
    return this.operations.generateReportSnapshot({
      tenantId,
      module: 'class-teacher-command',
      reportId: 'class-teacher-operations',
      title: String(dto?.type || dto?.name || dto?.title || 'Class teacher report'),
      format: dto?.format,
      generatedByUserId: userId,
      sections: { overview, myClass, learnerProfiles, academics, discipline, welfare, parentContacts, comments },
      filters: { requested_from: 'class-teacher-dashboard', type: dto?.type },
      targetRoles: ['principal', 'dean_academics', 'exams_manager'],
    });
  }

  async notifyAttendanceParent(studentId: string, dto: any) {
    return this.createStudentGuardianMessage(
      studentId,
      'attendance.follow_up_parent_notified',
      String(dto?.message || 'Please follow up on the learner attendance record.'),
      Boolean(dto?.sendSms ?? dto?.send_sms),
    );
  }

  async resolveAttendanceFollowUp(studentId: string) {
    const { tenantId, userId, role } = this.requireScope();
    const canonicalStudentId = this.requireUuid(studentId, 'Learner');
    const result = await this.operations.writeSql(
      `
        WITH target_student AS (
          SELECT DISTINCT student.id::text AS student_id
          FROM academics_class_teachers appointment
          JOIN student_class_assignments assignment ON assignment.tenant_id = appointment.tenant_id
            AND assignment.class_section_id::text = appointment.class_section_id::text AND assignment.status = 'active'
          JOIN students student ON student.tenant_id = assignment.tenant_id AND student.id::text = assignment.student_id::text
          WHERE appointment.tenant_id = $1 AND appointment.teacher_user_id = $2::uuid
            AND appointment.is_active = TRUE AND LOWER(COALESCE(appointment.status, 'active')) = 'active'
            AND COALESCE(appointment.effective_from, CURRENT_DATE) <= CURRENT_DATE
            AND (appointment.effective_to IS NULL OR appointment.effective_to >= CURRENT_DATE)
            AND student.id::text = $3::uuid::text
            AND EXISTS (
              SELECT 1 FROM academics_attendance attendance
              WHERE attendance.tenant_id = appointment.tenant_id
                AND attendance.student_id::text = student.id::text
                AND LOWER(attendance.status) IN ('absent', 'late')
            )
        ), inserted_event AS (
          INSERT INTO workflow_events (
            tenant_id, source_user_id, source_role, target_roles, event_type, entity_type, entity_id,
            title, message, priority, payload
          )
          SELECT $1, $2::uuid, $4, '["principal","deputy_principal"]'::jsonb,
                 'attendance.follow_up_resolved', 'student', student_id,
                 'Attendance follow-up resolved', 'The class teacher completed the learner attendance follow-up.',
                 'normal', jsonb_build_object('student_id', student_id, 'source_dashboard', 'class-teacher-command')
          FROM target_student
          RETURNING id::text, entity_id
        ), inserted_audit AS (
          INSERT INTO audit_logs (tenant_id, actor_user_id, request_id, action, resource_type, resource_id, metadata)
          SELECT $1, $2::uuid, current_setting('app.request_id', true), 'attendance.follow_up_resolved',
                 'student', entity_id::uuid, jsonb_build_object('workflow_event_id', id)
          FROM inserted_event
          RETURNING id
        )
        SELECT id AS event_id, entity_id AS student_id FROM inserted_event
      `,
      [tenantId, userId, canonicalStudentId, role],
    );
    if (!result.rows[0]) {
      throw new ForbiddenException('The learner is outside your active class or has no attendance exception to resolve.');
    }
    return { success: true, message: 'Attendance follow-up marked resolved', resolvedCount: 1 };
  }

  async addDisciplineFollowUp(incidentId: string, dto: any) {
    const canonicalIncidentId = this.requireUuid(incidentId, 'Discipline incident');
    await this.assertAssignedDisciplineIncident(canonicalIncidentId);
    return this.createWorkflowEvent('discipline.follow_up_added', 'discipline_incident', canonicalIncidentId, 'Discipline follow-up added', String(dto?.note || dto?.message || 'Class teacher added a discipline follow-up.'), ['discipline_master', 'dean_academics']);
  }

  async escalateDisciplineFollowUp(incidentId: string) {
    const canonicalIncidentId = this.requireUuid(incidentId, 'Discipline incident');
    await this.assertAssignedDisciplineIncident(canonicalIncidentId);
    return this.createWorkflowEvent('discipline.follow_up_escalated', 'discipline_incident', canonicalIncidentId, 'Discipline follow-up escalated', 'Class teacher escalated this discipline follow-up.', ['discipline_master', 'dean_academics', 'principal']);
  }

  async createWelfareNote(dto: any) {
    const { tenantId, userId, role } = this.requireScope();
    const studentId = this.requireUuid(dto?.studentId ?? dto?.student_id, 'Learner');
    const description = this.operations.requiredText(dto?.description ?? dto?.note ?? dto?.message, 'Welfare note').slice(0, 4000);
    const categoryKey = String(dto?.category || 'Other').trim().toLowerCase();
    const categoryByKey: Record<string, string> = {
      family: 'Family',
      financial: 'Financial',
      health: 'Health',
      social: 'Social',
      emotional: 'Emotional',
      bereavement: 'Bereavement',
      other: 'Other',
    };
    const category = categoryByKey[categoryKey];
    if (!category) {
      throw new BadRequestException('Welfare category must be Family, Financial, Health, Social, Emotional, Bereavement, or Other.');
    }
    const severityKey = String(dto?.severity || 'Medium').trim().toLowerCase();
    const severityByKey: Record<string, string> = { low: 'Low', medium: 'Medium', high: 'High' };
    const severity = severityByKey[severityKey];
    if (!severity) throw new BadRequestException('Welfare severity must be Low, Medium, or High.');
    const followUpDate = dto?.follow_up_date ?? dto?.followUpDate ?? null;
    if (followUpDate && Number.isNaN(new Date(followUpDate).getTime())) {
      throw new BadRequestException('Follow-up date is invalid');
    }
    const targetRoles = severity === 'High' ? ['deputy_principal', 'school_counsellor'] : ['class_teacher'];
    const result = await this.operations.writeSql(
      `
        WITH target_student AS (
          SELECT DISTINCT student.id::text AS student_id
          FROM academics_class_teachers appointment
          JOIN student_class_assignments assignment ON assignment.tenant_id = appointment.tenant_id
            AND assignment.class_section_id::text = appointment.class_section_id::text AND assignment.status = 'active'
          JOIN students student ON student.tenant_id = assignment.tenant_id AND student.id::text = assignment.student_id::text
          WHERE appointment.tenant_id = $1 AND appointment.teacher_user_id = $2::uuid
            AND appointment.is_active = TRUE AND LOWER(COALESCE(appointment.status, 'active')) = 'active'
            AND COALESCE(appointment.effective_from, CURRENT_DATE) <= CURRENT_DATE
            AND (appointment.effective_to IS NULL OR appointment.effective_to >= CURRENT_DATE)
            AND student.id::text = $3::uuid::text
        ), inserted_note AS (
          INSERT INTO student_notes (
            tenant_id, student_id, note_type, visibility, description, follow_up_date, created_by_user_id
          )
          SELECT $1, student_id, 'welfare', 'staff', $6, $7::date, $2::uuid
          FROM target_student
          RETURNING *
        ), inserted_event AS (
          INSERT INTO workflow_events (
            tenant_id, source_user_id, source_role, target_roles, event_type, entity_type, entity_id,
            title, message, priority, payload
          )
          SELECT $1, $2::uuid, $8, $9::jsonb, 'welfare.note_created', 'student_note', note.id::text,
                 'Learner welfare note recorded',
                 $5 || ' welfare concern recorded for an assigned learner.',
                 CASE WHEN $5 = 'High' THEN 'high' ELSE 'normal' END,
                 jsonb_build_object(
                   'student_id', note.student_id,
                   'category', $4,
                   'severity', $5,
                   'source_dashboard', 'class-teacher-command'
                 )
          FROM inserted_note note
          RETURNING id::text, entity_id
        ), inserted_notifications AS (
          INSERT INTO notifications (
            tenant_id, notification_key, recipient_role, type, title, body, status,
            source_module, source_record_id, metadata
          )
          SELECT $1, 'class-teacher-welfare-' || event.entity_id || '-' || role_name,
                 role_name, 'welfare.note_created', 'High-priority learner welfare concern',
                 'A class teacher recorded a high-priority welfare concern for an assigned learner.',
                 'unread', 'class-teacher-command', event.entity_id,
                 jsonb_build_object('student_id', $3::uuid, 'category', $4, 'severity', $5,
                   'source_dashboard', 'class-teacher-command')
          FROM inserted_event event
          CROSS JOIN unnest(ARRAY['deputy_principal', 'school_counsellor']::text[]) AS role_name
          WHERE $5 = 'High'
          RETURNING id
        ), inserted_audit AS (
          INSERT INTO audit_logs (tenant_id, actor_user_id, request_id, action, resource_type, resource_id, metadata)
          SELECT $1, $2::uuid, current_setting('app.request_id', true), 'welfare.note_created',
                 'student_note', event.entity_id::uuid,
                 jsonb_build_object(
                   'workflow_event_id', event.id,
                   'student_id', $3::uuid,
                   'category', $4,
                   'severity', $5,
                   'staff_notification_count', (SELECT COUNT(*) FROM inserted_notifications)
                 )
          FROM inserted_event event
          RETURNING id
        )
        SELECT note.*, $4::text AS category, $5::text AS severity,
               (SELECT id FROM inserted_event LIMIT 1) AS workflow_event_id,
               (SELECT COUNT(*)::int FROM inserted_notifications) AS staff_notification_count,
               (SELECT COUNT(*)::int FROM inserted_audit) AS audits_created
        FROM inserted_note note
      `,
      [
        tenantId,
        userId,
        studentId,
        category,
        severity,
        description,
        followUpDate,
        role,
        JSON.stringify(targetRoles),
      ],
    );
    const note: any = result.rows[0];
    if (!note || !note.workflow_event_id || Number(note.audits_created) !== 1) {
      throw new ForbiddenException('The learner is outside your active class-teacher appointment.');
    }
    return {
      success: true,
      message: severity === 'High'
        ? `Welfare note saved and ${Number(note.staff_notification_count || 0)} safeguarding notification(s) created.`
        : 'Welfare note saved.',
      note,
    };
  }

  async escalateWelfareNote(noteId: string) {
    const { tenantId, userId, role } = this.requireScope();
    const canonicalNoteId = this.requireUuid(noteId, 'Welfare note');
    const targetRoles = ['deputy_principal', 'principal', 'school_counsellor'];
    const result = await this.operations.writeSql(
      `
        WITH welfare_candidates AS (
          SELECT id::text, student_id::text, 'student_note'::text AS entity_type
          FROM student_notes
          WHERE tenant_id = $1 AND id = $3::uuid AND note_type = 'welfare'
          UNION ALL
          SELECT id::text, student_id::text, 'student_welfare_case'::text
          FROM student_welfare_cases
          WHERE tenant_id = $1 AND id = $3::uuid
        ), welfare_record AS (
          SELECT * FROM welfare_candidates LIMIT 1
        ), assigned_record AS (
          SELECT record.*
          FROM welfare_record record
          JOIN student_class_assignments assignment ON assignment.tenant_id = $1
            AND assignment.student_id::text = record.student_id AND assignment.status = 'active'
          JOIN academics_class_teachers appointment ON appointment.tenant_id = assignment.tenant_id
            AND appointment.class_section_id::text = assignment.class_section_id::text
          WHERE appointment.teacher_user_id = $2::uuid AND appointment.is_active = TRUE
            AND LOWER(COALESCE(appointment.status, 'active')) = 'active'
            AND COALESCE(appointment.effective_from, CURRENT_DATE) <= CURRENT_DATE
            AND (appointment.effective_to IS NULL OR appointment.effective_to >= CURRENT_DATE)
            AND NOT EXISTS (
              SELECT 1
              FROM workflow_events existing
              WHERE existing.tenant_id = $1
                AND existing.entity_type = record.entity_type
                AND existing.entity_id = record.id
                AND existing.event_type = 'welfare.note_escalated'
            )
          LIMIT 1
        ), inserted_event AS (
          INSERT INTO workflow_events (
            tenant_id, source_user_id, source_role, target_roles, event_type, entity_type, entity_id,
            title, message, priority, payload
          )
          SELECT $1, $2::uuid, $4, $5::jsonb, 'welfare.note_escalated', record.entity_type, record.id,
                 'Learner welfare note escalated',
                 'A class teacher escalated a learner welfare concern for safeguarding review.',
                 'high', jsonb_build_object('student_id', record.student_id,
                   'source_dashboard', 'class-teacher-command')
          FROM assigned_record record
          RETURNING id::text, entity_type, entity_id
        ), inserted_notifications AS (
          INSERT INTO notifications (
            tenant_id, notification_key, recipient_role, type, title, body, status,
            source_module, source_record_id, metadata
          )
          SELECT $1, 'class-teacher-welfare-escalation-' || event.entity_id || '-' || role_name,
                 role_name, 'welfare.note_escalated', 'Learner welfare concern escalated',
                 'A class teacher escalated a learner welfare concern for safeguarding review.',
                 'unread', 'class-teacher-command', event.entity_id,
                 jsonb_build_object('workflow_event_id', event.id, 'source_dashboard', 'class-teacher-command')
          FROM inserted_event event
          CROSS JOIN unnest($6::text[]) AS role_name
          RETURNING id
        ), inserted_audit AS (
          INSERT INTO audit_logs (tenant_id, actor_user_id, request_id, action, resource_type, resource_id, metadata)
          SELECT $1, $2::uuid, current_setting('app.request_id', true), 'welfare.note_escalated',
                 event.entity_type, event.entity_id::uuid,
                 jsonb_build_object('workflow_event_id', event.id,
                   'staff_notification_count', (SELECT COUNT(*) FROM inserted_notifications))
          FROM inserted_event event
          RETURNING id
        )
        SELECT event.id AS event_id, event.entity_type, event.entity_id,
               (SELECT COUNT(*)::int FROM inserted_notifications) AS staff_notification_count,
               (SELECT COUNT(*)::int FROM inserted_audit) AS audits_created
        FROM inserted_event event
      `,
      [tenantId, userId, canonicalNoteId, role, JSON.stringify(targetRoles), targetRoles],
    );
    const event: any = result.rows[0];
    if (!event || Number(event.audits_created) !== 1) {
      throw new ForbiddenException('The welfare record is outside your active class-teacher appointment or is already escalated.');
    }
    return {
      success: true,
      message: `Welfare concern escalated to ${Number(event.staff_notification_count || 0)} safeguarding role inbox(es).`,
      event,
    };
  }

  async messageParent(parentId: string, dto: any) {
    const { tenantId, userId, role } = this.requireScope();
    const canonicalGuardianId = this.requireUuid(parentId, 'Guardian');
    const message = this.operations.requiredText(dto?.message, 'Message');
    const subject = String(dto?.subject || 'Message from class teacher').trim().slice(0, 180);
    const sendSms = Boolean(dto?.sendSms ?? dto?.send_sms ?? String(dto?.channel || '').toLowerCase() === 'sms');
    const result = await this.operations.writeSql(
      `
        WITH target_guardian AS (
          SELECT DISTINCT guardian.id, guardian.user_id, guardian.student_id::text, guardian.phone
          FROM student_guardians guardian
          JOIN student_class_assignments assignment ON assignment.tenant_id = guardian.tenant_id
            AND assignment.student_id::text = guardian.student_id::text AND assignment.status = 'active'
          JOIN academics_class_teachers appointment ON appointment.tenant_id = assignment.tenant_id
            AND appointment.class_section_id::text = assignment.class_section_id::text
          WHERE guardian.tenant_id = $1 AND guardian.id = $3::uuid
            AND guardian.status = 'active' AND guardian.user_id IS NOT NULL
            AND EXISTS (SELECT 1 FROM tenant_memberships membership
              WHERE membership.tenant_id = guardian.tenant_id AND membership.user_id = guardian.user_id AND membership.status = 'active')
            AND appointment.teacher_user_id = $2::uuid AND appointment.is_active = TRUE
            AND LOWER(COALESCE(appointment.status, 'active')) = 'active'
            AND COALESCE(appointment.effective_from, CURRENT_DATE) <= CURRENT_DATE
            AND (appointment.effective_to IS NULL OR appointment.effective_to >= CURRENT_DATE)
        ), inserted_notification AS (
          INSERT INTO notifications (
            tenant_id, notification_key, recipient_user_id, recipient_guardian_id, type, title, body,
            status, source_module, source_record_id, metadata
          )
          SELECT $1, 'class-teacher-parent-message-' || id::text || '-' || gen_random_uuid()::text,
                 user_id, id, 'class_teacher.parent_message', $4, $5, 'unread',
                 'class-teacher-command', student_id,
                 jsonb_build_object('guardian_id', id, 'student_id', student_id, 'source_dashboard', 'class-teacher-command')
          FROM target_guardian
          RETURNING id::text, recipient_guardian_id, source_record_id
        ), inserted_sms AS (
          INSERT INTO communication_sms_outbox (
            tenant_id, recipient_phone, message, status, sent_by, dispatch_key
          )
          SELECT
            $1,
            phone,
            $5,
            'Pending',
            $2::uuid,
            'class-teacher-parent-message:'
              || NULLIF(current_setting('app.request_id', true), '')
              || ':' || id::text
          FROM target_guardian
          WHERE $6::boolean = TRUE AND NULLIF(BTRIM(phone), '') IS NOT NULL
          ON CONFLICT (tenant_id, dispatch_key) DO UPDATE
          SET dispatch_key = EXCLUDED.dispatch_key
          WHERE communication_sms_outbox.recipient_phone = EXCLUDED.recipient_phone
            AND communication_sms_outbox.message = EXCLUDED.message
            AND communication_sms_outbox.sent_by IS NOT DISTINCT FROM EXCLUDED.sent_by
          RETURNING id, status
        ), sms_outcome AS (
          SELECT
            COUNT(*)::int AS outbox_count,
            (COUNT(*) FILTER (WHERE LOWER(status) IN ('pending', 'queued')))::int AS queued_count,
            (COUNT(*) FILTER (WHERE LOWER(status) = 'processing'))::int AS processing_count,
            (COUNT(*) FILTER (WHERE LOWER(status) IN ('accepted', 'sent', 'provider_accepted')))::int AS accepted_count,
            (COUNT(*) FILTER (WHERE LOWER(status) NOT IN (
              'pending', 'queued', 'processing', 'accepted', 'sent', 'provider_accepted'
            )))::int AS needs_review_count
          FROM inserted_sms
        ), inserted_event AS (
          INSERT INTO workflow_events (tenant_id, source_user_id, source_role, target_roles, event_type,
            entity_type, entity_id, title, message, priority, payload)
          SELECT $1, $2::uuid, $7, '["principal","secretary"]'::jsonb, 'class_teacher.parent_message_sent',
                 'student_guardian', $3::uuid::text, $4, $5, 'normal',
                 jsonb_build_object('guardian_id', $3::uuid, 'portal_notification_count', (SELECT COUNT(*) FROM inserted_notification),
                   'sms_queued_count', (SELECT queued_count FROM sms_outcome),
                   'sms_processing_count', (SELECT processing_count FROM sms_outcome),
                   'sms_accepted_count', (SELECT accepted_count FROM sms_outcome),
                   'sms_needs_review_count', (SELECT needs_review_count FROM sms_outcome),
                   'source_dashboard', 'class-teacher-command')
          WHERE EXISTS (SELECT 1 FROM inserted_notification)
          RETURNING id::text
        ), inserted_audit AS (
          INSERT INTO audit_logs (tenant_id, actor_user_id, request_id, action, resource_type, resource_id, metadata)
          SELECT $1, $2::uuid, current_setting('app.request_id', true), 'class_teacher.parent_message_sent',
                 'student_guardian', $3::uuid,
                 jsonb_build_object('workflow_event_id', id, 'portal_notification_count', (SELECT COUNT(*) FROM inserted_notification),
                   'sms_queued_count', (SELECT queued_count FROM sms_outcome),
                   'sms_processing_count', (SELECT processing_count FROM sms_outcome),
                   'sms_accepted_count', (SELECT accepted_count FROM sms_outcome),
                   'sms_needs_review_count', (SELECT needs_review_count FROM sms_outcome))
          FROM inserted_event RETURNING id
        )
        SELECT (SELECT COUNT(*)::int FROM inserted_notification) AS portal_count,
               (SELECT queued_count FROM sms_outcome) AS sms_count,
               (SELECT processing_count FROM sms_outcome) AS sms_processing_count,
               (SELECT accepted_count FROM sms_outcome) AS sms_accepted_count,
               (SELECT needs_review_count FROM sms_outcome) AS sms_needs_review_count,
               (SELECT outbox_count FROM sms_outcome) AS sms_outbox_count,
               (SELECT id FROM inserted_event LIMIT 1) AS event_id
      `,
      [tenantId, userId, canonicalGuardianId, subject, message, sendSms, role],
    );
    const summary: any = result.rows[0];
    if (!summary || Number(summary.portal_count) === 0) {
      throw new ForbiddenException('The guardian is not an active portal member for a learner in your assigned class.');
    }
    const smsCount = Number(summary.sms_count || 0);
    const smsProcessingCount = Number(summary.sms_processing_count || 0);
    const smsAcceptedCount = Number(summary.sms_accepted_count || 0);
    const smsNeedsReviewCount = Number(summary.sms_needs_review_count || 0);
    const smsOutboxCount = Number(
      summary.sms_outbox_count ?? smsCount + smsProcessingCount + smsAcceptedCount + smsNeedsReviewCount,
    );
    return {
      success: true,
      message: `Queued 1 parent portal notice${sendSms ? `; SMS: ${this.describeSmsOutboxOutcome({
        queued: smsCount,
        processing: smsProcessingCount,
        accepted: smsAcceptedCount,
        needsReview: smsNeedsReviewCount,
      })}` : ''}.`,
      notificationCount: 1,
      smsQueuedCount: smsCount,
      smsProcessingCount,
      smsAcceptedCount,
      smsNeedsReviewCount,
      smsOutboxCount,
    };
  }

  async sendClassCommunication(dto: any) {
    const { tenantId, userId, role } = this.requireScope();
    const audience = String(dto?.audience || dto?.type || '').trim().toLowerCase();
    if (!['individual_parent', 'class_announcement'].includes(audience)) {
      throw new BadRequestException('Communication audience must be an individual parent or an assigned class announcement.');
    }
    const learnerId = audience === 'individual_parent'
      ? this.requireUuid(dto?.learnerId ?? dto?.studentId ?? dto?.student_id, 'Learner')
      : null;
    const classSectionId = audience === 'class_announcement'
      ? this.operations.requiredText(dto?.classSectionId ?? dto?.class_section_id, 'Assigned class')
      : null;
    const subject = this.operations.requiredText(dto?.subject || (audience === 'individual_parent' ? 'Parent message' : 'Class announcement'), 'Subject').slice(0, 180);
    const message = this.operations.requiredText(dto?.message ?? dto?.body, 'Message').slice(0, 1000);
    const sendSms = Boolean(dto?.sendSms ?? dto?.send_sms);
    const result = await this.operations.writeSql(
      `
        WITH assigned_students AS (
          SELECT DISTINCT student.id::text AS student_id, assignment.class_section_id::text
          FROM academics_class_teachers appointment
          JOIN student_class_assignments assignment ON assignment.tenant_id = appointment.tenant_id
            AND assignment.class_section_id::text = appointment.class_section_id::text AND assignment.status = 'active'
          JOIN students student ON student.tenant_id = assignment.tenant_id AND student.id::text = assignment.student_id::text
          WHERE appointment.tenant_id = $1 AND appointment.teacher_user_id = $2::uuid
            AND appointment.is_active = TRUE AND LOWER(COALESCE(appointment.status, 'active')) = 'active'
            AND COALESCE(appointment.effective_from, CURRENT_DATE) <= CURRENT_DATE
            AND (appointment.effective_to IS NULL OR appointment.effective_to >= CURRENT_DATE)
            AND (($3 = 'individual_parent' AND student.id::text = $4::uuid::text)
              OR ($3 = 'class_announcement' AND assignment.class_section_id::text = $5))
        ), target_guardians AS (
          SELECT guardian.id, guardian.user_id, guardian.phone,
                 ARRAY_AGG(DISTINCT learner.student_id) AS student_ids,
                 MIN(learner.class_section_id) AS class_section_id
          FROM assigned_students learner
          JOIN student_guardians guardian ON guardian.tenant_id = $1 AND guardian.student_id::text = learner.student_id
            AND guardian.status = 'active' AND guardian.user_id IS NOT NULL
          WHERE EXISTS (SELECT 1 FROM tenant_memberships membership
            WHERE membership.tenant_id = guardian.tenant_id AND membership.user_id = guardian.user_id AND membership.status = 'active')
          GROUP BY guardian.id, guardian.user_id, guardian.phone
        ), inserted_notifications AS (
          INSERT INTO notifications (tenant_id, notification_key, recipient_user_id, recipient_guardian_id, type,
            title, body, status, source_module, source_record_id, metadata)
          SELECT $1, 'class-teacher-communication-' || id::text || '-' || gen_random_uuid()::text,
                 user_id, id, 'class_teacher.communication_sent', $6, $7, 'unread', 'class-teacher-command',
                 class_section_id, jsonb_build_object('guardian_id', id, 'student_ids', to_jsonb(student_ids),
                   'class_section_id', class_section_id, 'audience', $3, 'source_dashboard', 'class-teacher-command')
          FROM target_guardians
          RETURNING id
        ), inserted_sms AS (
          INSERT INTO communication_sms_outbox (
            tenant_id, recipient_phone, message, status, sent_by, dispatch_key
          )
          SELECT
            $1,
            phone,
            $7,
            'Pending',
            $2::uuid,
            'class-teacher-communication:'
              || NULLIF(current_setting('app.request_id', true), '')
              || ':' || id::text
          FROM target_guardians
          WHERE $8::boolean = TRUE AND NULLIF(BTRIM(phone), '') IS NOT NULL
          ON CONFLICT (tenant_id, dispatch_key) DO UPDATE
          SET dispatch_key = EXCLUDED.dispatch_key
          WHERE communication_sms_outbox.recipient_phone = EXCLUDED.recipient_phone
            AND communication_sms_outbox.message = EXCLUDED.message
            AND communication_sms_outbox.sent_by IS NOT DISTINCT FROM EXCLUDED.sent_by
          RETURNING id, status
        ), sms_outcome AS (
          SELECT
            COUNT(*)::int AS outbox_count,
            (COUNT(*) FILTER (WHERE LOWER(status) IN ('pending', 'queued')))::int AS queued_count,
            (COUNT(*) FILTER (WHERE LOWER(status) = 'processing'))::int AS processing_count,
            (COUNT(*) FILTER (WHERE LOWER(status) IN ('accepted', 'sent', 'provider_accepted')))::int AS accepted_count,
            (COUNT(*) FILTER (WHERE LOWER(status) NOT IN (
              'pending', 'queued', 'processing', 'accepted', 'sent', 'provider_accepted'
            )))::int AS needs_review_count
          FROM inserted_sms
        ), inserted_event AS (
          INSERT INTO workflow_events (tenant_id, source_user_id, source_role, target_roles, event_type, entity_type,
            entity_id, title, message, priority, payload)
          SELECT $1, $2::uuid, $9, '["principal","secretary"]'::jsonb, 'class_teacher.communication_sent',
                 'class_communication', COALESCE($4::text, $5), $6, $7, 'normal',
                 jsonb_build_object('audience', $3, 'class_section_id', $5,
                   'portal_notification_count', (SELECT COUNT(*) FROM inserted_notifications),
                   'sms_queued_count', (SELECT queued_count FROM sms_outcome),
                   'sms_processing_count', (SELECT processing_count FROM sms_outcome),
                   'sms_accepted_count', (SELECT accepted_count FROM sms_outcome),
                   'sms_needs_review_count', (SELECT needs_review_count FROM sms_outcome),
                   'source_dashboard', 'class-teacher-command')
          WHERE EXISTS (SELECT 1 FROM inserted_notifications)
          RETURNING id::text
        ), inserted_audit AS (
          INSERT INTO audit_logs (tenant_id, actor_user_id, request_id, action, resource_type, resource_id, metadata)
          SELECT $1, $2::uuid, current_setting('app.request_id', true), 'class_teacher.communication_sent',
                 'class_communication', NULL,
                 jsonb_build_object('workflow_event_id', id, 'audience', $3, 'class_section_id', $5,
                   'portal_notification_count', (SELECT COUNT(*) FROM inserted_notifications),
                   'sms_queued_count', (SELECT queued_count FROM sms_outcome),
                   'sms_processing_count', (SELECT processing_count FROM sms_outcome),
                   'sms_accepted_count', (SELECT accepted_count FROM sms_outcome),
                   'sms_needs_review_count', (SELECT needs_review_count FROM sms_outcome))
          FROM inserted_event RETURNING id
        )
        SELECT (SELECT COUNT(*)::int FROM assigned_students) AS learner_count,
               (SELECT COUNT(*)::int FROM inserted_notifications) AS portal_count,
               (SELECT queued_count FROM sms_outcome) AS sms_count,
               (SELECT processing_count FROM sms_outcome) AS sms_processing_count,
               (SELECT accepted_count FROM sms_outcome) AS sms_accepted_count,
               (SELECT needs_review_count FROM sms_outcome) AS sms_needs_review_count,
               (SELECT outbox_count FROM sms_outcome) AS sms_outbox_count,
               (SELECT id FROM inserted_event LIMIT 1) AS event_id
      `,
      [tenantId, userId, audience, learnerId, classSectionId, subject, message, sendSms, role],
    );
    const summary: any = result.rows[0];
    if (!summary || Number(summary.learner_count) === 0) {
      throw new ForbiddenException('The selected learner or class is outside your active class-teacher appointment.');
    }
    if (Number(summary.portal_count) === 0) {
      throw new BadRequestException('No active parent portal membership is linked to the selected learner or class.');
    }
    const portalCount = Number(summary.portal_count);
    const smsCount = Number(summary.sms_count || 0);
    const smsProcessingCount = Number(summary.sms_processing_count || 0);
    const smsAcceptedCount = Number(summary.sms_accepted_count || 0);
    const smsNeedsReviewCount = Number(summary.sms_needs_review_count || 0);
    const smsOutboxCount = Number(
      summary.sms_outbox_count ?? smsCount + smsProcessingCount + smsAcceptedCount + smsNeedsReviewCount,
    );
    return {
      success: true,
      message: `Queued ${portalCount} exact parent portal notice${portalCount === 1 ? '' : 's'}${sendSms ? `; SMS: ${this.describeSmsOutboxOutcome({
        queued: smsCount,
        processing: smsProcessingCount,
        accepted: smsAcceptedCount,
        needsReview: smsNeedsReviewCount,
      })}` : ''}.`,
      notificationCount: portalCount,
      smsQueuedCount: smsCount,
      smsProcessingCount,
      smsAcceptedCount,
      smsNeedsReviewCount,
      smsOutboxCount,
    };
  }

  async recordAction(dto: any) {
    const action = String(dto?.action || 'workflow_action')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'workflow_action';
    const title = String(dto?.title || `Class teacher ${action.replace(/_/g, ' ')}`).trim();
    const message = String(dto?.description || dto?.message || title).trim();
    return this.createWorkflowEvent(
      'class_teacher.workflow_action',
      String(dto?.entityType || 'class_teacher_workflow'),
      String(dto?.entityId || dto?.studentId || dto?.student_id || 'class'),
      title,
      message,
      ['principal', 'deputy_principal', 'class_teacher', 'secretary'],
    );
  }

  async createLearnerNote(studentId: string, dto: any) {
    const { tenantId, userId } = this.requireScope();
    const canonicalStudentId = this.requireUuid(studentId, 'Learner');
    const description = this.operations.requiredText(dto?.description ?? dto?.note ?? dto?.message, 'Note');
    const visibility = String(dto?.visibility || 'staff').trim().toLowerCase();
    if (!['staff', 'class_teacher', 'leadership'].includes(visibility)) {
      throw new BadRequestException('Learner-note visibility must be staff, class teacher, or leadership.');
    }
    const followUpDate = dto?.follow_up_date || dto?.followUpDate || null;
    if (followUpDate && Number.isNaN(new Date(followUpDate).getTime())) {
      throw new BadRequestException('Follow-up date is invalid');
    }
    const result = await this.operations.writeSql(
      `
        WITH target_student AS (
          SELECT DISTINCT student.id::text AS student_id
          FROM academics_class_teachers appointment
          JOIN student_class_assignments assignment ON assignment.tenant_id = appointment.tenant_id
            AND assignment.class_section_id::text = appointment.class_section_id::text AND assignment.status = 'active'
          JOIN students student ON student.tenant_id = assignment.tenant_id AND student.id::text = assignment.student_id::text
          WHERE appointment.tenant_id = $1 AND appointment.teacher_user_id = $2::uuid
            AND appointment.is_active = TRUE AND LOWER(COALESCE(appointment.status, 'active')) = 'active'
            AND COALESCE(appointment.effective_from, CURRENT_DATE) <= CURRENT_DATE
            AND (appointment.effective_to IS NULL OR appointment.effective_to >= CURRENT_DATE)
            AND student.id::text = $3::uuid::text
        )
        INSERT INTO student_notes (
          tenant_id, student_id, note_type, visibility, description, follow_up_date, created_by_user_id
        )
        SELECT $1, student_id, $4, $5, $6, $7::date, $2::uuid FROM target_student
        RETURNING *
      `,
      [
        tenantId,
        userId,
        canonicalStudentId,
        String(dto?.note_type || dto?.type || 'general').slice(0, 60),
        visibility,
        description,
        followUpDate,
      ],
    );
    const note = result.rows[0];
    if (!note) throw new ForbiddenException('The learner is outside your active class-teacher appointment.');
    await this.operations.recordAudit(tenantId, 'class_teacher.learner_note_created', 'student_note', note.id, { studentId: canonicalStudentId }, userId);
    return { success: true, message: 'Learner note saved', note };
  }

  async scheduleMeeting(dto: any) {
    const { tenantId, userId, role } = this.requireScope();
    const studentId = this.requireUuid(dto?.studentId ?? dto?.student_id, 'Learner');
    const guardianId = dto?.guardianId || dto?.guardian_id
      ? this.requireUuid(dto.guardianId ?? dto.guardian_id, 'Guardian')
      : null;
    const title = this.operations.requiredText(dto?.title ?? dto?.agenda, 'Meeting agenda');
    const startTime = new Date(this.operations.requiredText(dto?.start_time ?? dto?.startTime, 'Meeting start time'));
    if (Number.isNaN(startTime.getTime())) throw new BadRequestException('Meeting start time is invalid');
    const requestedEnd = dto?.end_time ?? dto?.endTime;
    const endTime = requestedEnd ? new Date(requestedEnd) : new Date(startTime.getTime() + 30 * 60 * 1000);
    if (Number.isNaN(endTime.getTime()) || endTime <= startTime) throw new BadRequestException('Meeting end time must be after its start time');
    const description = String(dto?.description || '').trim();
    const result = await this.operations.writeSql(
      `
        WITH target_guardian AS (
          SELECT guardian.id, guardian.user_id, guardian.display_name,
                 assignment.class_section_id::text AS class_section_id,
                 student.id::text AS student_id, CONCAT_WS(' ', student.first_name, student.last_name) AS student_name
          FROM academics_class_teachers appointment
          JOIN student_class_assignments assignment ON assignment.tenant_id = appointment.tenant_id
            AND assignment.class_section_id::text = appointment.class_section_id::text AND assignment.status = 'active'
          JOIN students student ON student.tenant_id = assignment.tenant_id AND student.id::text = assignment.student_id::text
          JOIN student_guardians guardian ON guardian.tenant_id = student.tenant_id AND guardian.student_id::text = student.id::text
            AND guardian.status = 'active' AND guardian.user_id IS NOT NULL
          WHERE appointment.tenant_id = $1 AND appointment.teacher_user_id = $2::uuid
            AND appointment.is_active = TRUE AND LOWER(COALESCE(appointment.status, 'active')) = 'active'
            AND COALESCE(appointment.effective_from, CURRENT_DATE) <= CURRENT_DATE
            AND (appointment.effective_to IS NULL OR appointment.effective_to >= CURRENT_DATE)
            AND student.id::text = $3::uuid::text
            AND ($4::uuid IS NULL OR guardian.id = $4::uuid)
            AND EXISTS (SELECT 1 FROM tenant_memberships membership
              WHERE membership.tenant_id = guardian.tenant_id AND membership.user_id = guardian.user_id AND membership.status = 'active')
          ORDER BY guardian.is_primary DESC, guardian.created_at
          LIMIT 1
        ), inserted_meeting AS (
          INSERT INTO school_meetings (tenant_id, title, description, start_time, end_time, organizer_id, status)
          SELECT $1, $5,
                 CONCAT('Guardian: ', display_name, '; learner: ', student_name,
                   CASE WHEN NULLIF($6, '') IS NULL THEN '' ELSE CONCAT('. ', $6) END),
                 $7::timestamptz, $8::timestamptz, $2::uuid, 'SCHEDULED'
          FROM target_guardian
          RETURNING *
        ), inserted_notification AS (
          INSERT INTO notifications (tenant_id, notification_key, recipient_user_id, recipient_guardian_id, type,
            title, body, status, source_module, source_record_id, metadata)
          SELECT $1, 'class-teacher-meeting-' || meeting.id::text || '-' || guardian.id::text,
                 guardian.user_id, guardian.id, 'class_teacher.meeting_scheduled', 'Parent meeting scheduled',
                 $5 || ' is scheduled for ' || $7 || '.', 'unread', 'class-teacher-command', meeting.id::text,
                 jsonb_build_object('meeting_id', meeting.id, 'student_id', guardian.student_id,
                   'guardian_id', guardian.id, 'class_section_id', guardian.class_section_id)
          FROM inserted_meeting meeting CROSS JOIN target_guardian guardian
          RETURNING id
        ), inserted_event AS (
          INSERT INTO workflow_events (tenant_id, source_user_id, source_role, target_roles, event_type, entity_type,
            entity_id, title, message, priority, payload)
          SELECT $1, $2::uuid, $9, '["secretary"]'::jsonb, 'class_teacher.meeting_scheduled', 'school_meeting',
                 meeting.id::text, 'Parent meeting scheduled', $5 || ' is scheduled for ' || $7 || '.', 'normal',
                 jsonb_build_object('meeting_id', meeting.id, 'student_id', guardian.student_id,
                   'guardian_id', guardian.id, 'class_section_id', guardian.class_section_id,
                   'source_dashboard', 'class-teacher-command')
          FROM inserted_meeting meeting CROSS JOIN target_guardian guardian
          RETURNING id::text, entity_id
        ), inserted_audit AS (
          INSERT INTO audit_logs (tenant_id, actor_user_id, request_id, action, resource_type, resource_id, metadata)
          SELECT $1, $2::uuid, current_setting('app.request_id', true), 'class_teacher.meeting_scheduled',
                 'school_meeting', event.entity_id::uuid,
                 jsonb_build_object('workflow_event_id', event.id, 'student_id', guardian.student_id,
                   'guardian_id', guardian.id, 'class_section_id', guardian.class_section_id)
          FROM inserted_event event CROSS JOIN target_guardian guardian RETURNING id
        )
        SELECT meeting.*, guardian.id::text AS guardian_id, guardian.student_id, guardian.class_section_id
        FROM inserted_meeting meeting CROSS JOIN target_guardian guardian
      `,
      [tenantId, userId, studentId, guardianId, title, description, startTime.toISOString(), endTime.toISOString(), role],
    );
    const meeting = result.rows[0];
    if (!meeting) throw new ForbiddenException('No active guardian portal membership exists for that learner in your assigned class.');
    return { success: true, message: 'Parent meeting scheduled and the selected guardian was notified', meeting };
  }

  async createTask(dto: any) {
    const { tenantId, userId } = await this.assertActiveAppointment();
    const title = this.operations.requiredText(dto?.title ?? dto?.task, 'Task title');
    const dueDate = dto?.due_date ?? dto?.dueDate ?? null;
    if (dueDate && Number.isNaN(new Date(dueDate).getTime())) throw new BadRequestException('Task due date is invalid');
    const result = await this.operations.writeSql(
      `INSERT INTO school_tasks (tenant_id, assigned_to, title, due_date, status)
       VALUES ($1, $2::uuid, $3, $4::timestamptz, 'PENDING') RETURNING *`,
      [tenantId, userId, title, dueDate ? new Date(dueDate).toISOString() : null],
    );
    const task = result.rows[0];
    await this.operations.recordAudit(tenantId, 'class_teacher.task_created', 'school_task', task.id, { task }, userId);
    return { success: true, message: 'Class-teacher task created', task };
  }

  async completeTask(taskId: string) {
    const { tenantId, userId } = await this.assertActiveAppointment();
    const canonicalTaskId = this.requireUuid(taskId, 'Task');
    const result = await this.operations.writeSql(
      `UPDATE school_tasks SET status = 'COMPLETED', updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2::uuid AND assigned_to = $3::uuid AND status <> 'COMPLETED'
       RETURNING *`,
      [tenantId, canonicalTaskId, userId],
    );
    const task = result.rows[0];
    if (!task) throw new BadRequestException('Task was not found, is already complete, or is assigned to another user');
    await this.operations.recordAudit(tenantId, 'class_teacher.task_completed', 'school_task', task.id, { task }, userId);
    return { success: true, message: 'Task completed', task };
  }

  private async createStudentGuardianMessage(studentId: string, type: string, message: string, sendSms = false) {
    const { tenantId, userId, role } = this.requireScope();
    const canonicalStudentId = this.requireUuid(studentId, 'Learner');
    const body = this.operations.requiredText(message, 'Message').slice(0, 1000);
    const result = await this.operations.writeSql(
      `
        WITH target_guardians AS (
          SELECT DISTINCT guardian.id, guardian.user_id, guardian.phone, student.id::text AS student_id
          FROM academics_class_teachers appointment
          JOIN student_class_assignments assignment ON assignment.tenant_id = appointment.tenant_id
            AND assignment.class_section_id::text = appointment.class_section_id::text AND assignment.status = 'active'
          JOIN students student ON student.tenant_id = assignment.tenant_id AND student.id::text = assignment.student_id::text
          JOIN student_guardians guardian ON guardian.tenant_id = student.tenant_id AND guardian.student_id::text = student.id::text
            AND guardian.status = 'active' AND guardian.user_id IS NOT NULL
          WHERE appointment.tenant_id = $1 AND appointment.teacher_user_id = $2::uuid
            AND appointment.is_active = TRUE AND LOWER(COALESCE(appointment.status, 'active')) = 'active'
            AND COALESCE(appointment.effective_from, CURRENT_DATE) <= CURRENT_DATE
            AND (appointment.effective_to IS NULL OR appointment.effective_to >= CURRENT_DATE)
            AND student.id::text = $3::uuid::text
            AND EXISTS (SELECT 1 FROM tenant_memberships membership
              WHERE membership.tenant_id = guardian.tenant_id AND membership.user_id = guardian.user_id AND membership.status = 'active')
            AND EXISTS (SELECT 1 FROM academics_attendance attendance
              WHERE attendance.tenant_id = student.tenant_id AND attendance.student_id::text = student.id::text
                AND LOWER(attendance.status) IN ('absent', 'late'))
        ), inserted_notifications AS (
          INSERT INTO notifications (tenant_id, notification_key, recipient_user_id, recipient_guardian_id, type,
            title, body, status, source_module, source_record_id, metadata)
          SELECT $1, $4 || '-' || guardian.id::text || '-' || gen_random_uuid()::text, guardian.user_id, guardian.id,
                 $4, 'Class teacher attendance follow-up', $5, 'unread', 'class-teacher-command', guardian.student_id,
                 jsonb_build_object('student_id', guardian.student_id, 'guardian_id', guardian.id,
                   'source_dashboard', 'class-teacher-command')
          FROM target_guardians guardian
          RETURNING id
        ), inserted_sms AS (
          INSERT INTO communication_sms_outbox (
            tenant_id, recipient_phone, message, status, sent_by, dispatch_key
          )
          SELECT
            $1,
            phone,
            $5,
            'Pending',
            $2::uuid,
            'class-teacher-attendance-follow-up:'
              || NULLIF(current_setting('app.request_id', true), '')
              || ':' || id::text
          FROM target_guardians
          WHERE $6::boolean = TRUE AND NULLIF(BTRIM(phone), '') IS NOT NULL
          ON CONFLICT (tenant_id, dispatch_key) DO UPDATE
          SET dispatch_key = EXCLUDED.dispatch_key
          WHERE communication_sms_outbox.recipient_phone = EXCLUDED.recipient_phone
            AND communication_sms_outbox.message = EXCLUDED.message
            AND communication_sms_outbox.sent_by IS NOT DISTINCT FROM EXCLUDED.sent_by
          RETURNING id, status
        ), sms_outcome AS (
          SELECT
            COUNT(*)::int AS outbox_count,
            (COUNT(*) FILTER (WHERE LOWER(status) IN ('pending', 'queued')))::int AS queued_count,
            (COUNT(*) FILTER (WHERE LOWER(status) = 'processing'))::int AS processing_count,
            (COUNT(*) FILTER (WHERE LOWER(status) IN ('accepted', 'sent', 'provider_accepted')))::int AS accepted_count,
            (COUNT(*) FILTER (WHERE LOWER(status) NOT IN (
              'pending', 'queued', 'processing', 'accepted', 'sent', 'provider_accepted'
            )))::int AS needs_review_count
          FROM inserted_sms
        ), inserted_event AS (
          INSERT INTO workflow_events (tenant_id, source_user_id, source_role, target_roles, event_type, entity_type,
            entity_id, title, message, priority, payload)
          SELECT $1, $2::uuid, $7, '["principal","secretary"]'::jsonb, $4, 'student', $3::uuid::text,
                 'Class teacher attendance follow-up', $5, 'normal',
                 jsonb_build_object('student_id', $3::uuid, 'portal_notification_count', (SELECT COUNT(*) FROM inserted_notifications),
                   'sms_queued_count', (SELECT queued_count FROM sms_outcome),
                   'sms_processing_count', (SELECT processing_count FROM sms_outcome),
                   'sms_accepted_count', (SELECT accepted_count FROM sms_outcome),
                   'sms_needs_review_count', (SELECT needs_review_count FROM sms_outcome),
                   'source_dashboard', 'class-teacher-command')
          WHERE EXISTS (SELECT 1 FROM inserted_notifications)
          RETURNING id::text
        ), inserted_audit AS (
          INSERT INTO audit_logs (tenant_id, actor_user_id, request_id, action, resource_type, resource_id, metadata)
          SELECT $1, $2::uuid, current_setting('app.request_id', true), $4, 'student', $3::uuid,
                 jsonb_build_object('workflow_event_id', id, 'portal_notification_count', (SELECT COUNT(*) FROM inserted_notifications),
                   'sms_queued_count', (SELECT queued_count FROM sms_outcome),
                   'sms_processing_count', (SELECT processing_count FROM sms_outcome),
                   'sms_accepted_count', (SELECT accepted_count FROM sms_outcome),
                   'sms_needs_review_count', (SELECT needs_review_count FROM sms_outcome))
          FROM inserted_event RETURNING id
        )
        SELECT (SELECT COUNT(*)::int FROM inserted_notifications) AS portal_count,
               (SELECT queued_count FROM sms_outcome) AS sms_count,
               (SELECT processing_count FROM sms_outcome) AS sms_processing_count,
               (SELECT accepted_count FROM sms_outcome) AS sms_accepted_count,
               (SELECT needs_review_count FROM sms_outcome) AS sms_needs_review_count,
               (SELECT outbox_count FROM sms_outcome) AS sms_outbox_count,
               (SELECT id FROM inserted_event LIMIT 1) AS event_id
      `,
      [tenantId, userId, canonicalStudentId, type, body, sendSms, role],
    );
    const summary: any = result.rows[0];
    if (!summary || Number(summary.portal_count) === 0) {
      throw new ForbiddenException('The learner is outside your active class, has no attendance exception, or has no active guardian portal membership.');
    }
    const portalCount = Number(summary.portal_count);
    const smsCount = Number(summary.sms_count || 0);
    const smsProcessingCount = Number(summary.sms_processing_count || 0);
    const smsAcceptedCount = Number(summary.sms_accepted_count || 0);
    const smsNeedsReviewCount = Number(summary.sms_needs_review_count || 0);
    const smsOutboxCount = Number(
      summary.sms_outbox_count ?? smsCount + smsProcessingCount + smsAcceptedCount + smsNeedsReviewCount,
    );
    return {
      success: true,
      message: `Queued ${portalCount} exact parent portal notice${portalCount === 1 ? '' : 's'}${sendSms ? `; SMS: ${this.describeSmsOutboxOutcome({
        queued: smsCount,
        processing: smsProcessingCount,
        accepted: smsAcceptedCount,
        needsReview: smsNeedsReviewCount,
      })}` : ''}.`,
      notificationCount: portalCount,
      smsQueuedCount: smsCount,
      smsProcessingCount,
      smsAcceptedCount,
      smsNeedsReviewCount,
      smsOutboxCount,
    };
  }

  private async createWorkflowEvent(type: string, entityType: string, entityId: string, title: string, message: string, targetRoles: string[]) {
    const { tenantId, userId, role } = await this.assertActiveAppointment();
    const staffRoles = new Set(['principal', 'deputy_principal', 'class_teacher', 'secretary', 'discipline_master', 'dean_academics', 'school_counsellor', 'exams_manager']);
    if (targetRoles.length === 0 || targetRoles.some((targetRole) => !staffRoles.has(targetRole))) {
      throw new BadRequestException('Class-teacher workflow events may target authorized school staff roles only.');
    }
    const result = await this.operations.writeSql(
      `
        INSERT INTO workflow_events (
          tenant_id, source_user_id, source_role, target_roles, event_type, entity_type, entity_id, title, message, priority, payload
        )
        VALUES ($1, $2::uuid, $3, $4::jsonb, $5, $6, $7, $8, $9, 'normal', $10::jsonb)
        RETURNING *
      `,
      [
        tenantId,
        userId,
        role,
        JSON.stringify(targetRoles),
        type,
        entityType,
        entityId,
        title,
        message,
        JSON.stringify({ source_dashboard: 'class-teacher-command' }),
      ],
    );
    await this.operations.notifyRoles(tenantId, {
      key: `${type}-${entityId}-${Date.now()}`,
      type,
      title,
      body: message,
      targetRoles,
      metadata: { entityType, entityId },
    });
    await this.operations.recordAudit(tenantId, type, entityType, entityId, { title, message, targetRoles }, userId);
    return { success: true, message: 'Action routed', event: result.rows[0] };
  }

  private async assertAssignedDisciplineIncident(incidentId: string): Promise<void> {
    const { tenantId, userId } = this.requireScope();
    const result = await this.executeSql(
      `SELECT incident.id::text
       FROM discipline_incidents incident
       JOIN student_class_assignments assignment ON assignment.tenant_id = incident.tenant_id
         AND assignment.student_id::text = incident.student_id::text AND assignment.status = 'active'
       JOIN academics_class_teachers appointment ON appointment.tenant_id = assignment.tenant_id
         AND appointment.class_section_id::text = assignment.class_section_id::text
       WHERE incident.tenant_id = $1 AND incident.id = $3::uuid
         AND appointment.teacher_user_id = $2::uuid AND appointment.is_active = TRUE
         AND LOWER(COALESCE(appointment.status, 'active')) = 'active'
         AND COALESCE(appointment.effective_from, CURRENT_DATE) <= CURRENT_DATE
         AND (appointment.effective_to IS NULL OR appointment.effective_to >= CURRENT_DATE)
       LIMIT 1`,
      [tenantId, userId, incidentId],
    );
    if (!result.rows[0]) throw new ForbiddenException('The discipline incident is outside your active class-teacher appointment.');
  }

  private uuidOrNull(value: unknown): string | null {
    const text = String(value ?? '').trim();
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text) ? text : null;
  }
}
