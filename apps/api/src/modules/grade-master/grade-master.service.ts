import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { notificationRecipientPredicate } from '../notifications/notification-recipient-predicate';

type GradeMasterRow = Record<string, any>;

type GradeMasterScopeRow = {
  class_section_id: string;
  stream_id: string | null;
  academic_level_id: string | null;
  grade_level: string | null;
  section_name: string;
  stream_name: string | null;
  is_section_wide: boolean;
};

type GradeMasterScope = {
  entries: GradeMasterScopeRow[];
  classSectionIds: string[];
  sectionWideClassIds: string[];
  streamIds: string[];
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const GRADE_MASTER_STAFF_ROLES = new Set([
  'grade_master',
  'class_teacher',
  'teacher',
  'deputy_principal',
  'secretary',
  'discipline_master',
  'hod',
  'dean_of_academics',
  'exams_manager',
]);
const EXACT_GUARDIAN_ACTIONS = new Set([
  'parent_message_sent',
  'parent_attendance_message_sent',
  'learner_follow_up_recorded',
  'learner_meeting_scheduled',
  'learner_meeting_rescheduled',
  'bulk_notice',
]);
const EXACT_STAFF_ACTIONS = new Set([
  'teacher_message',
  'academic_intervention_requested',
  'request_comments',
  'message_teacher',
  'class_teacher_welfare_notification_sent',
  'learner_concern_recorded',
  'deputy_escalation_requested',
  'learner_follow_up_recorded',
  'grade_note_added',
  'attendance_reason_recorded',
]);
const ALLOWED_ACTION_ROLES: Record<string, string[]> = {
  parent_message_sent: ['grade_master', 'secretary'],
  parent_attendance_message_sent: ['grade_master', 'secretary'],
  learner_follow_up_recorded: ['grade_master', 'class_teacher'],
  learner_meeting_scheduled: ['grade_master', 'secretary'],
  learner_meeting_rescheduled: ['grade_master', 'secretary'],
  bulk_notice: ['grade_master'],
  learner_concern_recorded: ['grade_master', 'class_teacher', 'deputy_principal'],
  deputy_escalation_requested: ['grade_master', 'class_teacher', 'deputy_principal'],
  grade_note_added: ['grade_master', 'class_teacher'],
  attendance_reason_recorded: ['grade_master', 'class_teacher', 'secretary'],
  teacher_message: ['grade_master', 'class_teacher', 'teacher'],
  academic_intervention_requested: ['grade_master', 'teacher', 'hod', 'dean_of_academics'],
  request_comments: ['grade_master', 'class_teacher', 'teacher', 'exams_manager'],
  message_teacher: ['grade_master', 'class_teacher', 'teacher', 'exams_manager'],
  report_approval_requested: ['grade_master', 'exams_manager'],
  discipline_incident_referral_requested: ['grade_master', 'discipline_master', 'deputy_principal'],
  discipline_resolution_requested: ['grade_master', 'discipline_master'],
  discipline_escalation_requested: ['grade_master', 'discipline_master', 'deputy_principal'],
  class_teacher_welfare_notification_sent: ['grade_master', 'class_teacher'],
  add_comment: ['grade_master', 'deputy_principal'],
  grade_record_opened: ['grade_master'],
  grade_export_created: ['grade_master'],
};

@Injectable()
export class GradeMasterService {
  constructor(private readonly prisma: PrismaService) {}

  private requireUuid(value: unknown, label: string) {
    const normalized = String(value ?? '').trim();
    if (!UUID_PATTERN.test(normalized)) {
      throw new BadRequestException(`${label} must be a valid identifier.`);
    }
    return normalized;
  }

  private normalizeRole(value: unknown) {
    return String(value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  }

  private requireText(value: unknown, label: string, maxLength = 1000) {
    const normalized = String(value ?? '').trim();
    if (!normalized) throw new BadRequestException(`${label} is required.`);
    if (normalized.length > maxLength) throw new BadRequestException(`${label} is too long.`);
    return normalized;
  }

  private requireIsoDate(value: unknown, label: string) {
    const normalized = String(value ?? '').trim();
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
    if (!match) throw new BadRequestException(`${label} must use YYYY-MM-DD.`);
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (
      parsed.getUTCFullYear() !== year
      || parsed.getUTCMonth() !== month - 1
      || parsed.getUTCDate() !== day
    ) {
      throw new BadRequestException(`${label} must be a valid calendar date.`);
    }
    return normalized;
  }

  private normalizeGradeLevelId(gradeLevelId?: string | null) {
    const normalized = String(gradeLevelId ?? '').trim();
    return normalized.length > 0 ? normalized : null;
  }

  private async requireScope(
    tenantId: string,
    userId: string,
    gradeLevelId?: string | null,
  ): Promise<GradeMasterScope> {
    const normalizedTenantId = this.requireText(tenantId, 'Tenant context', 160);
    const normalizedUserId = this.requireUuid(userId, 'User context');
    const { rows } = await this.executeSql<GradeMasterScopeRow>(
      `
        WITH active_appointments AS (
          SELECT appointment.*
          FROM academics_role_appointments appointment
          JOIN tenant_memberships membership
            ON membership.tenant_id = appointment.tenant_id
           AND membership.user_id = appointment.teacher_user_id
           AND membership.status = 'active'
          WHERE appointment.tenant_id = $1
            AND appointment.teacher_user_id = $2::uuid
            AND appointment.role_type IN ('grade_master', 'form_master')
            AND appointment.status = 'active'
            AND (appointment.effective_from IS NULL OR appointment.effective_from::date <= CURRENT_DATE)
            AND (appointment.effective_to IS NULL OR appointment.effective_to::date >= CURRENT_DATE)
        ), managed_scope AS (
          SELECT
            section.id::text AS class_section_id,
            stream.id::text AS stream_id,
            section.academic_level_id::text AS academic_level_id,
            section.grade_level,
            section.name AS section_name,
            stream.name AS stream_name,
            TRUE AS is_section_wide
          FROM active_appointments appointment
          JOIN class_sections section
            ON section.tenant_id = appointment.tenant_id
           AND section.is_active = TRUE
           AND (appointment.academic_year_id IS NULL OR section.academic_year_id::text = appointment.academic_year_id::text)
           AND section.id::text = appointment.class_section_id::text
          LEFT JOIN class_streams stream
            ON stream.tenant_id = section.tenant_id
           AND stream.class_section_id::text = section.id::text
           AND stream.is_active = TRUE
          WHERE appointment.stream_id IS NULL
            AND appointment.class_section_id IS NOT NULL

          UNION

          SELECT
            section.id::text AS class_section_id,
            stream.id::text AS stream_id,
            section.academic_level_id::text AS academic_level_id,
            section.grade_level,
            section.name AS section_name,
            stream.name AS stream_name,
            FALSE AS is_section_wide
          FROM active_appointments appointment
          JOIN class_streams stream
            ON stream.tenant_id = appointment.tenant_id
           AND stream.id::text = appointment.stream_id::text
           AND stream.is_active = TRUE
          JOIN class_sections section
            ON section.tenant_id = stream.tenant_id
           AND section.id::text = stream.class_section_id::text
           AND section.is_active = TRUE
           AND (appointment.academic_year_id IS NULL OR section.academic_year_id::text = appointment.academic_year_id::text)
           AND (appointment.class_section_id IS NULL OR section.id::text = appointment.class_section_id::text)
          WHERE appointment.stream_id IS NOT NULL
        )
        SELECT DISTINCT
          class_section_id,
          stream_id,
          academic_level_id,
          grade_level,
          section_name,
          stream_name,
          is_section_wide
        FROM managed_scope
        ORDER BY class_section_id, stream_id NULLS FIRST
      `,
      [normalizedTenantId, normalizedUserId],
    );

    if (rows.length === 0) {
      throw new ForbiddenException('No active grade or form master appointment is assigned to this account.');
    }

    const requestedScope = this.normalizeGradeLevelId(gradeLevelId);
    const entries = requestedScope
      ? rows.filter((row) => [
          row.class_section_id,
          row.stream_id,
          row.academic_level_id,
          row.grade_level,
          row.section_name,
          row.stream_name,
        ].some((value) => String(value ?? '').trim().toLowerCase() === requestedScope.toLowerCase()))
      : rows;

    if (entries.length === 0) {
      throw new ForbiddenException('The selected grade, form, class, or stream is outside this appointment.');
    }

    return {
      entries,
      classSectionIds: [...new Set(entries.map((row) => row.class_section_id))],
      sectionWideClassIds: [...new Set(entries.filter((row) => row.is_section_wide).map((row) => row.class_section_id))],
      streamIds: [...new Set(entries.map((row) => row.stream_id).filter((value): value is string => Boolean(value)))],
    };
  }

  private assignmentScope(alias: string, sectionWideParam = '$2', streamParam = '$3') {
    return `(
      ${alias}.class_section_id::text = ANY(${sectionWideParam}::text[])
      OR ${alias}.stream_id::text = ANY(${streamParam}::text[])
    )`;
  }

  private async executeSql<T = GradeMasterRow>(query: string, params: any[] = []): Promise<{ rows: T[]; rowCount: number }> {
    if ((this.prisma as any).query) {
      return (this.prisma as any).query(query, params);
    }

    if ((this.prisma as any).executeWithTenant && typeof params[0] === 'string') {
      return (this.prisma as any).executeWithTenant(params[0], null, async (tx: any) => {
        const result = await tx.$queryRawUnsafe(query, ...params);
        const rows = Array.isArray(result) ? result : [result];
        return { rows, rowCount: rows.length };
      });
    }

    const result = await (this.prisma as any).$queryRawUnsafe(query, ...params);
    const rows = Array.isArray(result) ? result : [result];
    return { rows, rowCount: rows.length };
  }

  private percent(value: unknown) {
    const numeric = Number(value ?? 0);
    return `${Math.round(Number.isFinite(numeric) ? numeric : 0)}%`;
  }

  private money(minor: unknown) {
    const amount = Number(minor ?? 0) / 100;
    return `KES ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  private date(value: unknown) {
    if (!value) return 'N/A';
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleDateString('en-KE');
  }

  async getOverview(tenantId: string, userId: string, gradeLevelId?: string | null) {
    const scope = await this.requireScope(tenantId, userId, gradeLevelId);
    const query = `
      WITH grade_learners AS (
        SELECT
          assignment.tenant_id,
          assignment.student_id,
          assignment.class_section_id,
          assignment.stream_id,
          COALESCE(NULLIF(TRIM(CONCAT_WS(' ', section.name, stream.name)), ''), section.name) AS stream_name
        FROM student_class_assignments assignment
        JOIN class_sections section
          ON section.tenant_id = assignment.tenant_id
         AND section.id = assignment.class_section_id
        LEFT JOIN class_streams stream
          ON stream.tenant_id = assignment.tenant_id
         AND stream.id::text = assignment.stream_id::text
         AND stream.is_active = TRUE
        WHERE assignment.tenant_id = $1
          AND assignment.status = 'active'
          AND section.is_active = TRUE
          AND ${this.assignmentScope('assignment')}
      ),
      attendance_today AS (
        SELECT attendance.tenant_id, attendance.student_id, lower(attendance.status) AS status
        FROM academics_attendance attendance
        WHERE attendance.tenant_id = $1
          AND attendance.attendance_date = CURRENT_DATE
      ),
      mark_risk AS (
        SELECT marks.tenant_id::text AS tenant_id, marks.student_id
        FROM exam_marks marks
        JOIN grade_learners learner
          ON learner.student_id::text = marks.student_id::text
         AND learner.tenant_id = marks.tenant_id::text
        WHERE marks.status IN ('submitted', 'reviewed', 'locked', 'published')
        GROUP BY marks.tenant_id, marks.student_id
        HAVING AVG(marks.score) < 50
      ), current_exam_series AS (
        SELECT series.id
        FROM exam_series series
        WHERE series.tenant_id = $1
          AND lower(series.status) <> 'archived'
        ORDER BY series.created_at DESC
        LIMIT 1
      )
      SELECT
        (SELECT COUNT(DISTINCT student_id)::int FROM grade_learners) AS total_learners,
        (SELECT COUNT(DISTINCT learner.student_id)::int FROM grade_learners learner JOIN attendance_today attendance ON attendance.student_id::text = learner.student_id::text AND attendance.status = 'present') AS present_today,
        (SELECT COUNT(DISTINCT learner.student_id)::int FROM grade_learners learner JOIN attendance_today attendance ON attendance.student_id::text = learner.student_id::text AND attendance.status = 'absent') AS absent_today,
        (SELECT COUNT(DISTINCT learner.student_id)::int FROM grade_learners learner JOIN attendance_today attendance ON attendance.student_id::text = learner.student_id::text AND attendance.status = 'late') AS late_today,
        (
          SELECT COUNT(DISTINCT CONCAT(class_section_id::text, ':', COALESCE(stream_id::text, 'all')))::int
          FROM grade_learners
        ) AS streams_covered,
        (
          SELECT COUNT(DISTINCT incident.id)::int
          FROM discipline_incidents incident
          JOIN grade_learners learner
            ON learner.student_id::text = incident.student_id::text
           AND learner.tenant_id = incident.tenant_id::text
          WHERE lower(COALESCE(incident.status, 'open')) NOT IN ('closed', 'resolved', 'archived')
        ) AS open_discipline_cases,
        (SELECT COUNT(DISTINCT student_id)::int FROM mark_risk) AS academic_risk_learners,
        (
          SELECT COUNT(*)::int
          FROM workflow_events event
          WHERE event.tenant_id = $1
            AND event.event_type LIKE 'grade_master.%'
            AND event.status IN ('pending', 'open')
            AND (
              event.payload->>'learner_id' IN (SELECT student_id::text FROM grade_learners)
              OR event.payload->>'class_section_id' IN (SELECT class_section_id::text FROM grade_learners)
              OR event.payload->>'stream_id' = ANY($3::text[])
            )
        ) AS pending_parent_followups,
        (
          SELECT COUNT(*)::int
          FROM (
            SELECT learner.class_section_id, learner.stream_id
            FROM grade_learners learner
            LEFT JOIN current_exam_series series ON TRUE
            LEFT JOIN student_report_cards card
              ON card.tenant_id = learner.tenant_id
             AND card.exam_series_id = series.id
             AND card.student_id::text = learner.student_id::text
             AND card.is_current = TRUE
             AND lower(card.status) IN ('approved', 'published')
            GROUP BY learner.class_section_id, learner.stream_id
            HAVING COUNT(DISTINCT card.student_id) < COUNT(DISTINCT learner.student_id)
          ) incomplete_report_scope
        ) AS reports_not_ready,
        (
          SELECT COUNT(DISTINCT referral.id)::int
          FROM counselling_referrals referral
          JOIN grade_learners learner
            ON learner.student_id::text = referral.student_id::text
           AND learner.tenant_id = referral.tenant_id::text
          WHERE lower(COALESCE(referral.status, 'open')) NOT IN ('closed', 'resolved', 'archived')
        ) AS counselling_referrals,
        (
          SELECT COUNT(DISTINCT section.id)::int
          FROM class_streams stream
          JOIN class_sections section
            ON section.tenant_id = stream.tenant_id
           AND section.id::text = stream.class_section_id::text
           AND section.is_active = TRUE
          WHERE stream.tenant_id = $1
            AND stream.is_active = TRUE
            AND (
              section.id::text = ANY($2::text[])
              OR stream.id::text = ANY($3::text[])
            )
            AND stream.class_teacher_id IS NULL
        ) AS class_teacher_pending_updates
    `;
    const { rows } = await this.executeSql(query, [tenantId, scope.sectionWideClassIds, scope.streamIds]);
    return rows[0] ?? {
      total_learners: 0,
      present_today: 0,
      absent_today: 0,
      late_today: 0,
      streams_covered: 0,
      open_discipline_cases: 0,
      academic_risk_learners: 0,
      pending_parent_followups: 0,
      reports_not_ready: 0,
      counselling_referrals: 0,
      class_teacher_pending_updates: 0,
    };
  }

  async getLearners(tenantId: string, userId: string, gradeLevelId?: string | null) {
    const scope = await this.requireScope(tenantId, userId, gradeLevelId);
    const query = `
      WITH attendance_stats AS (
        SELECT
          attendance.tenant_id,
          attendance.student_id,
          COUNT(*) FILTER (WHERE lower(attendance.status) = 'present')::numeric AS present_count,
          COUNT(*)::numeric AS total_count
        FROM academics_attendance attendance
        WHERE attendance.tenant_id = $1
          AND attendance.attendance_date >= CURRENT_DATE - interval '30 days'
        GROUP BY attendance.tenant_id, attendance.student_id
      ),
      mark_stats AS (
        SELECT marks.tenant_id::text AS tenant_id, marks.student_id, AVG(marks.score)::numeric AS average_score
        FROM exam_marks marks
        WHERE marks.tenant_id::text = $1
          AND marks.status IN ('submitted', 'reviewed', 'locked', 'published')
        GROUP BY marks.tenant_id, marks.student_id
      )
      SELECT
        student.id::text,
        assignment.class_section_id::text,
        assignment.stream_id::text,
        stream.class_teacher_id::text AS class_teacher_user_id,
        student.admission_number,
        trim(student.first_name || ' ' || COALESCE(student.middle_name || ' ', '') || student.last_name) AS learner,
        COALESCE(NULLIF(TRIM(CONCAT_WS(' ', section.name, stream.name)), ''), section.name) AS stream,
        COALESCE(ROUND((attendance.present_count / NULLIF(attendance.total_count, 0)) * 100), 0)::int AS attendance_percentage,
        COALESCE(ROUND(mark.average_score), 0)::int AS average_score,
        CASE
          WHEN COALESCE(ROUND((attendance.present_count / NULLIF(attendance.total_count, 0)) * 100), 100) < 80
            OR COALESCE(mark.average_score, 100) < 50 THEN 'High'
          WHEN COALESCE(ROUND((attendance.present_count / NULLIF(attendance.total_count, 0)) * 100), 100) < 90
            OR COALESCE(mark.average_score, 100) < 60 THEN 'Medium'
          ELSE 'Low'
        END AS risk
      FROM student_class_assignments assignment
      JOIN students student
        ON student.tenant_id = assignment.tenant_id
       AND student.id = assignment.student_id
      JOIN class_sections section
        ON section.tenant_id = assignment.tenant_id
       AND section.id = assignment.class_section_id
      LEFT JOIN class_streams stream
        ON stream.tenant_id = assignment.tenant_id
       AND stream.id::text = assignment.stream_id::text
       AND stream.is_active = TRUE
      LEFT JOIN attendance_stats attendance
        ON attendance.tenant_id = assignment.tenant_id
       AND attendance.student_id::text = assignment.student_id::text
      LEFT JOIN mark_stats mark
        ON mark.tenant_id = assignment.tenant_id
       AND mark.student_id::text = assignment.student_id::text
      WHERE assignment.tenant_id = $1
        AND assignment.status = 'active'
        AND student.deleted_at IS NULL
        AND ${this.assignmentScope('assignment')}
      ORDER BY section.name ASC, student.first_name ASC, student.last_name ASC
      LIMIT 500
    `;
    const { rows } = await this.executeSql(query, [tenantId, scope.sectionWideClassIds, scope.streamIds]);
    return rows.map((row) => ({
      id: row.id,
      class_section_id: row.class_section_id,
      stream_id: row.stream_id,
      class_teacher_user_id: row.class_teacher_user_id,
      admission_number: row.admission_number,
      learner: row.learner,
      stream: row.stream,
      attendance: this.percent(row.attendance_percentage),
      average: this.percent(row.average_score),
      risk: row.risk,
    }));
  }

  async getStreams(tenantId: string, userId: string, gradeLevelId?: string | null) {
    const scope = await this.requireScope(tenantId, userId, gradeLevelId);
    const query = `
      SELECT
        COALESCE(stream.id::text, section.id::text) AS id,
        section.id::text AS class_section_id,
        stream.id::text AS stream_id,
        stream.class_teacher_id::text AS class_teacher_user_id,
        COALESCE(NULLIF(TRIM(CONCAT_WS(' ', section.name, stream.name)), ''), section.name) AS stream,
        COALESCE(profile.display_name, staff.full_name, 'Unassigned') AS class_teacher,
        COUNT(DISTINCT assignment.student_id)::int AS learners,
        COUNT(DISTINCT attendance.student_id) FILTER (WHERE lower(attendance.status) = 'present')::int AS present,
        COUNT(DISTINCT incident.id)::int AS open_concerns,
        MAX(attendance.created_at)::text AS last_update
      FROM class_sections section
      LEFT JOIN class_streams stream
        ON stream.tenant_id = section.tenant_id
       AND stream.class_section_id = section.id
       AND stream.is_active = TRUE
      LEFT JOIN staff_profiles profile
        ON profile.tenant_id = section.tenant_id
       AND profile.user_id = stream.class_teacher_id
      LEFT JOIN staff_members staff
        ON staff.tenant_id = section.tenant_id
       AND staff.user_id = stream.class_teacher_id
      LEFT JOIN student_class_assignments assignment
        ON assignment.tenant_id = section.tenant_id
       AND assignment.class_section_id = section.id
       AND assignment.status = 'active'
       AND (stream.id IS NULL OR assignment.stream_id::text = stream.id::text)
      LEFT JOIN academics_attendance attendance
        ON attendance.tenant_id = section.tenant_id
       AND attendance.student_id::text = assignment.student_id::text
       AND attendance.attendance_date = CURRENT_DATE
      LEFT JOIN discipline_incidents incident
        ON incident.tenant_id::text = section.tenant_id
       AND incident.student_id::text = assignment.student_id::text
       AND lower(COALESCE(incident.status, 'open')) NOT IN ('closed', 'resolved', 'archived')
      WHERE section.tenant_id = $1
        AND section.is_active = TRUE
        AND (
          section.id::text = ANY($2::text[])
          OR stream.id::text = ANY($3::text[])
        )
      GROUP BY section.id, section.name, stream.id, stream.name, profile.display_name, staff.full_name
      ORDER BY section.name ASC, stream.name ASC NULLS FIRST
    `;
    const { rows } = await this.executeSql(query, [tenantId, scope.sectionWideClassIds, scope.streamIds]);
    return rows.map((row) => ({
      ...row,
      last_update: row.last_update ? this.date(row.last_update) : 'No attendance today',
    }));
  }

  async getAttendance(tenantId: string, userId: string, gradeLevelId?: string | null) {
    const scope = await this.requireScope(tenantId, userId, gradeLevelId);
    const query = `
      SELECT
        student.id::text,
        assignment.class_section_id::text,
        assignment.stream_id::text,
        stream.class_teacher_id::text AS class_teacher_user_id,
        trim(student.first_name || ' ' || student.last_name) AS learner,
        COALESCE(NULLIF(TRIM(CONCAT_WS(' ', section.name, stream.name)), ''), section.name) AS stream,
        COALESCE(attendance.status, 'unmarked') AS status,
        COALESCE(NULLIF(attendance_follow_up.reason, ''), 'Not recorded') AS reason,
        COUNT(history.id) FILTER (WHERE lower(history.status) IN ('absent', 'late'))::int AS absence_count
      FROM student_class_assignments assignment
      JOIN students student
        ON student.tenant_id = assignment.tenant_id
       AND student.id = assignment.student_id
      JOIN class_sections section
        ON section.tenant_id = assignment.tenant_id
       AND section.id = assignment.class_section_id
      LEFT JOIN class_streams stream
        ON stream.tenant_id = assignment.tenant_id
       AND stream.id::text = assignment.stream_id::text
       AND stream.is_active = TRUE
      LEFT JOIN academics_attendance attendance
        ON attendance.tenant_id = assignment.tenant_id
       AND attendance.student_id::text = assignment.student_id::text
       AND attendance.attendance_date = CURRENT_DATE
      LEFT JOIN academics_attendance history
        ON history.tenant_id = assignment.tenant_id
       AND history.student_id::text = assignment.student_id::text
       AND history.attendance_date >= CURRENT_DATE - interval '90 days'
      LEFT JOIN LATERAL (
        SELECT event.payload->>'reason' AS reason
        FROM workflow_events event
        WHERE event.tenant_id = assignment.tenant_id
          AND event.event_type = 'grade_master.attendance_reason_recorded'
          AND event.payload->>'learner_id' = assignment.student_id::text
        ORDER BY event.created_at DESC
        LIMIT 1
      ) attendance_follow_up ON TRUE
      WHERE assignment.tenant_id = $1
        AND assignment.status = 'active'
        AND student.deleted_at IS NULL
        AND ${this.assignmentScope('assignment')}
        AND COALESCE(lower(attendance.status), 'unmarked') <> 'present'
      GROUP BY student.id, student.first_name, student.last_name, assignment.class_section_id, assignment.stream_id, section.name, stream.name, stream.class_teacher_id, attendance.status, attendance_follow_up.reason
      ORDER BY absence_count DESC, learner ASC
      LIMIT 100
    `;
    const { rows } = await this.executeSql(query, [tenantId, scope.sectionWideClassIds, scope.streamIds]);
    return rows;
  }

  async getAcademics(tenantId: string, userId: string, gradeLevelId?: string | null) {
    const scope = await this.requireScope(tenantId, userId, gradeLevelId);
    const query = `
      SELECT
        CONCAT(subject.id::text, ':', section.id::text, ':', COALESCE(learner_assignment.stream_id::text, 'all'), ':', teacher_assignment.teacher_user_id::text) AS id,
        subject.id::text AS subject_id,
        section.id::text AS class_section_id,
        learner_assignment.stream_id::text AS stream_id,
        teacher_assignment.teacher_user_id::text AS teacher_user_id,
        subject.name AS subject,
        COALESCE(profile.display_name, staff.full_name, 'Unassigned') AS teacher,
        ROUND(AVG(mark.score))::int AS average_score,
        COUNT(mark.id) FILTER (WHERE lower(mark.status) IN ('draft', 'missing'))::int AS missing_marks,
        COUNT(DISTINCT mark.student_id) FILTER (WHERE mark.score < 50)::int AS at_risk
      FROM teacher_subject_assignments teacher_assignment
      JOIN subjects subject
        ON subject.tenant_id = teacher_assignment.tenant_id
       AND subject.id::text = teacher_assignment.subject_id::text
      JOIN class_sections section
        ON section.tenant_id = teacher_assignment.tenant_id
       AND section.id::text = teacher_assignment.class_section_id::text
      JOIN student_class_assignments learner_assignment
        ON learner_assignment.tenant_id = teacher_assignment.tenant_id
       AND learner_assignment.class_section_id::text = teacher_assignment.class_section_id::text
       AND learner_assignment.status = 'active'
       AND (teacher_assignment.stream_id IS NULL OR teacher_assignment.stream_id::text = learner_assignment.stream_id::text)
      LEFT JOIN staff_profiles profile
        ON profile.tenant_id = teacher_assignment.tenant_id
       AND profile.user_id::text = teacher_assignment.teacher_user_id::text
      LEFT JOIN staff_members staff
        ON staff.tenant_id = teacher_assignment.tenant_id
       AND staff.user_id::text = teacher_assignment.teacher_user_id::text
      LEFT JOIN exam_marks mark
        ON mark.tenant_id::text = teacher_assignment.tenant_id
       AND mark.class_section_id::text = teacher_assignment.class_section_id::text
       AND mark.subject_id::text = teacher_assignment.subject_id::text
       AND mark.student_id::text = learner_assignment.student_id::text
      WHERE teacher_assignment.tenant_id = $1
        AND teacher_assignment.status = 'active'
        AND ${this.assignmentScope('learner_assignment')}
      GROUP BY subject.id, subject.name, section.id, learner_assignment.stream_id, teacher_assignment.teacher_user_id, profile.display_name, staff.full_name
      ORDER BY at_risk DESC, average_score ASC NULLS LAST, subject.name ASC
    `;
    const { rows } = await this.executeSql(query, [tenantId, scope.sectionWideClassIds, scope.streamIds]);
    return rows.map((row) => ({
      ...row,
      average: this.percent(row.average_score),
    }));
  }

  async getReportReadiness(tenantId: string, userId: string, gradeLevelId?: string | null) {
    const scope = await this.requireScope(tenantId, userId, gradeLevelId);
    const query = `
      WITH current_exam_series AS (
        SELECT series.id
        FROM exam_series series
        WHERE series.tenant_id = $1
          AND lower(series.status) <> 'archived'
        ORDER BY series.created_at DESC
        LIMIT 1
      )
      SELECT
        COALESCE(stream.id::text, section.id::text) AS id,
        section.id::text AS class_section_id,
        assignment.stream_id::text AS stream_id,
        stream.class_teacher_id::text AS class_teacher_user_id,
        series.id::text AS exam_series_id,
        COALESCE(NULLIF(TRIM(CONCAT_WS(' ', section.name, stream.name)), ''), section.name) AS stream,
        CASE
          WHEN series.id IS NULL THEN 'no_active_exam'
          WHEN COUNT(DISTINCT assignment.student_id) > 0
            AND COUNT(DISTINCT card.student_id) FILTER (
              WHERE lower(card.status) IN ('approved', 'published')
            ) = COUNT(DISTINCT assignment.student_id)
          THEN 'ready'
          WHEN COUNT(DISTINCT card.student_id) > 0 THEN 'in_review'
          ELSE 'pending'
        END AS status,
        COUNT(DISTINCT comment.student_id)::int AS comments_ready,
        COUNT(DISTINCT card.student_id)::int AS report_cards_generated,
        COUNT(DISTINCT card.student_id) FILTER (
          WHERE lower(card.status) IN ('approved', 'published')
        )::int AS report_cards_ready,
        COUNT(DISTINCT assignment.student_id)::int AS total_learners
      FROM class_sections section
      LEFT JOIN student_class_assignments assignment
        ON assignment.tenant_id = section.tenant_id
       AND assignment.class_section_id = section.id
       AND assignment.status = 'active'
      LEFT JOIN class_streams stream
        ON stream.tenant_id = assignment.tenant_id
       AND stream.id::text = assignment.stream_id::text
       AND stream.is_active = TRUE
      LEFT JOIN report_card_comments comment
        ON comment.tenant_id = section.tenant_id
       AND comment.class_section_id::text = section.id::text
       AND comment.student_id::text = assignment.student_id::text
       AND lower(comment.comment_status) IN ('submitted', 'approved', 'published')
      LEFT JOIN current_exam_series series ON TRUE
      LEFT JOIN student_report_cards card
        ON card.tenant_id = section.tenant_id
       AND card.exam_series_id = series.id
       AND card.student_id::text = assignment.student_id::text
       AND card.is_current = TRUE
      WHERE section.tenant_id = $1
        AND section.is_active = TRUE
        AND ${this.assignmentScope('assignment')}
      GROUP BY section.id, section.name, stream.id, stream.name, stream.class_teacher_id, assignment.stream_id, series.id
      ORDER BY section.name ASC
    `;
    const { rows } = await this.executeSql(query, [tenantId, scope.sectionWideClassIds, scope.streamIds]);
    return rows;
  }

  async getDiscipline(tenantId: string, userId: string, gradeLevelId?: string | null) {
    const scope = await this.requireScope(tenantId, userId, gradeLevelId);
    const query = `
      SELECT
        incident.id::text,
        incident.id::text AS case_no,
        student.id::text AS learner_id,
        assignment.class_section_id::text,
        assignment.stream_id::text,
        trim(student.first_name || ' ' || student.last_name) AS learner,
        COALESCE(NULLIF(TRIM(CONCAT_WS(' ', section.name, stream.name)), ''), section.name) AS stream,
        COALESCE(incident.severity, 'medium') AS severity,
        COALESCE(incident.status, 'open') AS status
      FROM discipline_incidents incident
      JOIN students student
        ON student.tenant_id = incident.tenant_id::text
       AND student.id::text = incident.student_id::text
      JOIN student_class_assignments assignment
        ON assignment.tenant_id = student.tenant_id
       AND assignment.student_id = student.id
       AND assignment.status = 'active'
      JOIN class_sections section
        ON section.tenant_id = assignment.tenant_id
       AND section.id = assignment.class_section_id
      LEFT JOIN class_streams stream
        ON stream.tenant_id = assignment.tenant_id
       AND stream.id::text = assignment.stream_id::text
       AND stream.is_active = TRUE
      WHERE incident.tenant_id::text = $1
        AND student.deleted_at IS NULL
        AND ${this.assignmentScope('assignment')}
      ORDER BY incident.created_at DESC
      LIMIT 100
    `;
    const { rows } = await this.executeSql(query, [tenantId, scope.sectionWideClassIds, scope.streamIds]);
    return rows;
  }

  async getWelfare(tenantId: string, userId: string, gradeLevelId?: string | null) {
    const scope = await this.requireScope(tenantId, userId, gradeLevelId);
    const query = `
      SELECT
        welfare.id::text,
        student.id::text AS learner_id,
        assignment.class_section_id::text,
        assignment.stream_id::text,
        stream.class_teacher_id::text AS class_teacher_user_id,
        trim(student.first_name || ' ' || student.last_name) AS learner,
        COALESCE(NULLIF(TRIM(CONCAT_WS(' ', section.name, stream.name)), ''), section.name) AS stream,
        welfare.category AS concern_type,
        'Not set' AS priority,
        'Not assigned' AS assigned_to,
        welfare.status
      FROM student_welfare_cases welfare
      JOIN students student
        ON student.tenant_id = welfare.tenant_id
       AND student.id::text = welfare.student_id::text
      JOIN student_class_assignments assignment
        ON assignment.tenant_id = student.tenant_id
       AND assignment.student_id = student.id
       AND assignment.status = 'active'
      JOIN class_sections section
        ON section.tenant_id = assignment.tenant_id
       AND section.id = assignment.class_section_id
      LEFT JOIN class_streams stream
        ON stream.tenant_id = assignment.tenant_id
       AND stream.id::text = assignment.stream_id::text
       AND stream.is_active = TRUE
      WHERE welfare.tenant_id = $1
        AND student.deleted_at IS NULL
        AND ${this.assignmentScope('assignment')}
      ORDER BY welfare.created_at DESC
      LIMIT 100
    `;
    const { rows } = await this.executeSql(query, [tenantId, scope.sectionWideClassIds, scope.streamIds]);
    return rows;
  }

  async getCommunications(tenantId: string, userId: string, gradeLevelId?: string | null) {
    const scope = await this.requireScope(tenantId, userId, gradeLevelId);
    const query = `
      SELECT
        notification.id::text,
        student.id::text AS learner_id,
        guardian.id::text AS guardian_id,
        assignment.class_section_id::text,
        assignment.stream_id::text,
        trim(student.first_name || ' ' || COALESCE(student.middle_name || ' ', '') || student.last_name) AS learner,
        guardian.display_name AS guardian,
        notification.created_at::text AS last_contacted,
        notification.type AS last_message_type,
        notification.status
      FROM notifications notification
      JOIN student_guardians guardian
        ON guardian.tenant_id = notification.tenant_id
       AND guardian.id = notification.recipient_guardian_id
       AND guardian.user_id = notification.recipient_user_id
       AND guardian.status = 'active'
      JOIN tenant_memberships guardian_membership
        ON guardian_membership.tenant_id = guardian.tenant_id
       AND guardian_membership.user_id = guardian.user_id
       AND guardian_membership.status = 'active'
      JOIN students student
        ON student.tenant_id = guardian.tenant_id
       AND student.id = guardian.student_id
       AND student.deleted_at IS NULL
      JOIN student_class_assignments assignment
        ON assignment.tenant_id = student.tenant_id
       AND assignment.student_id = student.id
       AND assignment.status = 'active'
      WHERE notification.tenant_id = $1
        AND notification.type LIKE 'grade_master.%'
        AND notification.recipient_guardian_id IS NOT NULL
        AND notification.recipient_user_id IS NOT NULL
        AND ${this.assignmentScope('assignment')}
      ORDER BY notification.created_at DESC
      LIMIT 100
    `;
    const { rows } = await this.executeSql(query, [tenantId, scope.sectionWideClassIds, scope.streamIds]);
    return rows.map((row) => ({ ...row, last_contacted: this.date(row.last_contacted) }));
  }

  async getMeetings(tenantId: string, userId: string, gradeLevelId?: string | null) {
    const scope = await this.requireScope(tenantId, userId, gradeLevelId);
    const query = `
      SELECT
        meeting.id::text,
        meeting.reason AS meeting_title,
        student.id::text AS learner_id,
        meeting.guardian_id::text,
        assignment.class_section_id::text,
        assignment.stream_id::text,
        trim(student.first_name || ' ' || student.last_name) AS learner,
        meeting.meeting_date::text AS date,
        meeting.start_time AS time,
        meeting.status
      FROM parent_meetings meeting
      JOIN students student
        ON student.tenant_id = meeting.tenant_id
       AND student.id = meeting.student_id
      JOIN student_class_assignments assignment
        ON assignment.tenant_id = student.tenant_id
       AND assignment.student_id = student.id
       AND assignment.status = 'active'
      JOIN class_sections section
        ON section.tenant_id = assignment.tenant_id
       AND section.id = assignment.class_section_id
      WHERE meeting.tenant_id = $1
        AND ${this.assignmentScope('assignment')}
      ORDER BY meeting.meeting_date DESC, meeting.start_time DESC
      LIMIT 100
    `;
    const { rows } = await this.executeSql(query, [tenantId, scope.sectionWideClassIds, scope.streamIds]);
    return rows.map((row) => ({ ...row, date: this.date(row.date) }));
  }

  async getTimetable(tenantId: string, userId: string, gradeLevelId?: string | null) {
    const scope = await this.requireScope(tenantId, userId, gradeLevelId);
    const query = `
      SELECT
        slot.id::text,
        section.id::text AS class_section_id,
        stream.id::text AS stream_id,
        CASE WHEN slot.day_of_week = EXTRACT(ISODOW FROM CURRENT_DATE)::int THEN 'Today' ELSE slot.day_of_week::text END AS day,
        to_char(slot.start_time, 'HH24:MI') AS time,
        COALESCE(NULLIF(TRIM(CONCAT_WS(' ', section.name, stream.name)), ''), section.name) AS stream,
        COALESCE(subject.name, slot.subject_id) AS subject,
        COALESCE(profile.display_name, staff.full_name, 'Unassigned') AS teacher,
        CASE WHEN log.id IS NULL THEN 'Pending' ELSE 'Completed' END AS status
      FROM academics_timetable_slots slot
      LEFT JOIN class_streams stream
        ON stream.tenant_id = slot.tenant_id
       AND stream.id::text = slot.class_id
       AND stream.is_active = TRUE
      JOIN class_sections section
        ON section.tenant_id = slot.tenant_id
       AND section.id::text = COALESCE(stream.class_section_id::text, slot.class_id)
      LEFT JOIN subjects subject
        ON subject.tenant_id = slot.tenant_id
       AND subject.id::text = slot.subject_id
      LEFT JOIN staff_profiles profile
        ON profile.tenant_id = slot.tenant_id
       AND profile.user_id = slot.teacher_id
      LEFT JOIN staff_members staff
        ON staff.tenant_id = slot.tenant_id
       AND staff.user_id = slot.teacher_id
      LEFT JOIN academics_lesson_logs log
        ON log.tenant_id::text = slot.tenant_id
       AND log.class_id::text = slot.class_id
       AND log.teacher_id = slot.teacher_id
       AND log.log_date = CURRENT_DATE
      WHERE slot.tenant_id = $1
        AND (
          section.id::text = ANY($2::text[])
          OR stream.id::text = ANY($3::text[])
          OR (stream.id IS NULL AND section.id::text = ANY($4::text[]))
        )
      ORDER BY slot.day_of_week ASC, slot.start_time ASC
      LIMIT 100
    `;
    const { rows } = await this.executeSql(query, [
      tenantId,
      scope.sectionWideClassIds,
      scope.streamIds,
      scope.classSectionIds,
    ]);
    return rows;
  }

  async getAssignments(tenantId: string, userId: string, gradeLevelId?: string | null) {
    const scope = await this.requireScope(tenantId, userId, gradeLevelId);
    const query = `
      SELECT
        assignment.id::text,
        section.id::text AS class_section_id,
        stream.id::text AS stream_id,
        assignment.title AS assignment,
        COALESCE(subject.name, assignment.subject_id) AS subject,
        COALESCE(NULLIF(TRIM(CONCAT_WS(' ', section.name, stream.name)), ''), section.name) AS stream,
        assignment.due_date::text,
        COUNT(DISTINCT learner.student_id) FILTER (
          WHERE submission.id IS NULL OR lower(submission.status) IN ('draft', 'returned')
        )::int AS missing_count
      FROM academics_assignments assignment
      LEFT JOIN class_streams stream
        ON stream.tenant_id = assignment.tenant_id
       AND stream.id::text = assignment.class_id
       AND stream.is_active = TRUE
      JOIN class_sections section
        ON section.tenant_id = assignment.tenant_id
       AND section.id::text = COALESCE(stream.class_section_id::text, assignment.class_id)
      LEFT JOIN subjects subject
        ON subject.tenant_id = assignment.tenant_id
       AND subject.id::text = assignment.subject_id
      LEFT JOIN student_class_assignments learner
        ON learner.tenant_id = assignment.tenant_id
       AND learner.class_section_id::text = section.id::text
       AND learner.status = 'active'
       AND (stream.id IS NULL OR learner.stream_id::text = stream.id::text)
       AND ${this.assignmentScope('learner')}
      LEFT JOIN academics_assignment_submissions submission
        ON submission.tenant_id = assignment.tenant_id
       AND submission.assignment_id::text = assignment.id::text
       AND submission.student_id::text = learner.student_id::text
      WHERE assignment.tenant_id = $1
        AND (
          section.id::text = ANY($2::text[])
          OR stream.id::text = ANY($3::text[])
          OR (stream.id IS NULL AND section.id::text = ANY($4::text[]))
        )
      GROUP BY assignment.id, section.id, section.name, stream.id, stream.name, subject.name
      ORDER BY assignment.due_date ASC
      LIMIT 100
    `;
    const { rows } = await this.executeSql(query, [
      tenantId,
      scope.sectionWideClassIds,
      scope.streamIds,
      scope.classSectionIds,
    ]);
    return rows.map((row: any) => ({ ...row, due_date: this.date(row.due_date) }));
  }

  async getRequests(tenantId: string, userId: string, gradeLevelId?: string | null) {
    const scope = await this.requireScope(tenantId, userId, gradeLevelId);
    const query = `
      WITH assigned_learners AS (
        SELECT DISTINCT assignment.student_id::text
        FROM student_class_assignments assignment
        WHERE assignment.tenant_id = $1
          AND assignment.status = 'active'
          AND ${this.assignmentScope('assignment')}
      )
      SELECT
        event.id::text,
        event.id::text AS request_no,
        event.event_type AS type,
        event.payload->>'learner_id' AS learner_id,
        event.payload->>'class_section_id' AS class_section_id,
        event.payload->>'stream_id' AS stream_id,
        COALESCE(event.entity_id, event.payload->>'learner_id', event.payload->>'stream_id', 'Grade workflow') AS learner_or_stream,
        COALESCE(event.target_roles->>0, 'grade_master') AS assigned_to,
        event.status
      FROM workflow_events event
      WHERE event.tenant_id = $1
        AND event.event_type LIKE 'grade_master.%'
        AND (
          event.payload->>'learner_id' IN (SELECT student_id FROM assigned_learners)
          OR event.payload->>'class_section_id' = ANY($4::text[])
          OR event.payload->>'stream_id' = ANY($3::text[])
        )
      ORDER BY event.created_at DESC
      LIMIT 100
    `;
    const { rows } = await this.executeSql(query, [
      tenantId,
      scope.sectionWideClassIds,
      scope.streamIds,
      scope.classSectionIds,
    ]);
    return rows;
  }

  async getReports(tenantId: string, userId: string, gradeLevelId?: string | null) {
    const scope = await this.requireScope(tenantId, userId, gradeLevelId);
    const scopeTokens = [...new Set(scope.entries.flatMap((entry) => [
      entry.academic_level_id,
      entry.grade_level,
      entry.section_name,
      entry.stream_name,
    ]).filter((value): value is string => Boolean(value)))];
    const query = `
      SELECT
        id::text,
        snapshot_id,
        title AS report_name,
        format AS type,
        created_at::text AS generated_at,
        'Ready' AS status
      FROM report_snapshots
      WHERE tenant_id = $1
        AND module = 'grade-master-command'
        AND (
          filters->>'class_section_id' = ANY($2::text[])
          OR filters->>'classSectionId' = ANY($2::text[])
          OR filters->>'stream_id' = ANY($3::text[])
          OR filters->>'streamId' = ANY($3::text[])
          OR filters->>'gradeLevelId' = ANY($4::text[])
          OR filters->>'grade_level_id' = ANY($4::text[])
          OR filters->>'grade_level' = ANY($4::text[])
        )
      ORDER BY created_at DESC
      LIMIT 50
    `;
    const { rows } = await this.executeSql(query, [tenantId, scope.classSectionIds, scope.streamIds, scopeTokens]);
    return rows.map((row) => ({
      ...row,
      download_url: `/api/grade-master/reports/${encodeURIComponent(String(row.snapshot_id || row.id))}/download`,
    }));
  }

  async downloadReport(tenantId: string, userId: string, snapshotId: string) {
    const scope = await this.requireScope(tenantId, userId);
    const scopeTokens = [...new Set(scope.entries.flatMap((entry) => [
      entry.academic_level_id,
      entry.grade_level,
      entry.section_name,
      entry.stream_name,
    ]).filter((value): value is string => Boolean(value)))];
    const normalizedSnapshotId = String(snapshotId ?? '').trim();
    if (!normalizedSnapshotId) {
      throw new BadRequestException('Report snapshot is required.');
    }

    const { rows } = await this.executeSql(
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
          AND module = 'grade-master-command'
          AND (
            filters->>'class_section_id' = ANY($3::text[])
            OR filters->>'classSectionId' = ANY($3::text[])
            OR filters->>'stream_id' = ANY($4::text[])
            OR filters->>'streamId' = ANY($4::text[])
            OR filters->>'gradeLevelId' = ANY($5::text[])
            OR filters->>'grade_level_id' = ANY($5::text[])
            OR filters->>'grade_level' = ANY($5::text[])
          )
        LIMIT 1
      `,
      [tenantId, normalizedSnapshotId, scope.classSectionIds, scope.streamIds, scopeTokens],
    );

    if (!rows[0]) {
      throw new BadRequestException('The requested grade-master report was not found for this school.');
    }

    return rows[0];
  }

  async getNotifications(tenantId: string, userId: string, gradeLevelId?: string | null) {
    const scope = await this.requireScope(tenantId, userId, gradeLevelId);
    const query = `
      WITH assigned_learners AS (
        SELECT assignment.student_id::text
        FROM student_class_assignments assignment
        WHERE assignment.tenant_id = $1
          AND assignment.status = 'active'
          AND ${this.assignmentScope('assignment', '$4', '$5')}
      )
      SELECT
        notification.id::text,
        notification.type,
        notification.title,
        notification.body AS message,
        COALESCE(notification.priority, 'normal') AS priority,
        notification.status,
        notification.created_at::text
      FROM notifications notification
      WHERE notification.tenant_id = $1
        AND ${notificationRecipientPredicate('notification', '$2', '$3')}
        AND (
          notification.recipient_user_id = $2::uuid
          OR notification.metadata->>'learner_id' IN (SELECT student_id FROM assigned_learners)
          OR notification.metadata->>'class_section_id' = ANY($6::text[])
          OR notification.metadata->>'stream_id' = ANY($5::text[])
        )
      ORDER BY notification.created_at DESC
      LIMIT 100
    `;
    const { rows } = await this.executeSql(query, [
      tenantId,
      userId,
      'grade_master',
      scope.sectionWideClassIds,
      scope.streamIds,
      scope.classSectionIds,
    ]);
    return rows.map((row) => ({ ...row, created_at: this.date(row.created_at) }));
  }

  private async requireScopedLearner(tenantId: string, scope: GradeMasterScope, learnerId: string) {
    const normalizedLearnerId = this.requireUuid(learnerId, 'Learner');
    const { rows } = await this.executeSql(
      `
        SELECT
          student.id::text AS learner_id,
          assignment.class_section_id::text,
          assignment.stream_id::text,
          trim(student.first_name || ' ' || COALESCE(student.middle_name || ' ', '') || student.last_name) AS learner_name
        FROM student_class_assignments assignment
        JOIN students student
          ON student.tenant_id = assignment.tenant_id
         AND student.id = assignment.student_id
         AND student.deleted_at IS NULL
        WHERE assignment.tenant_id = $1
          AND assignment.student_id::text = $2
          AND assignment.status = 'active'
          AND ${this.assignmentScope('assignment', '$3', '$4')}
        LIMIT 1
      `,
      [tenantId, normalizedLearnerId, scope.sectionWideClassIds, scope.streamIds],
    );
    if (!rows[0]) {
      throw new ForbiddenException('The selected learner is outside this grade or form master appointment.');
    }
    return rows[0];
  }

  private requireScopedClassOrStream(scope: GradeMasterScope, classSectionId?: unknown, streamId?: unknown) {
    const normalizedClassSectionId = String(classSectionId ?? '').trim() || null;
    const normalizedStreamId = String(streamId ?? '').trim() || null;
    if (!normalizedClassSectionId && !normalizedStreamId) return null;
    if (normalizedClassSectionId) this.requireUuid(normalizedClassSectionId, 'Class section');
    if (normalizedStreamId) this.requireUuid(normalizedStreamId, 'Stream');
    if (
      normalizedClassSectionId
      && !normalizedStreamId
      && !scope.sectionWideClassIds.includes(normalizedClassSectionId)
    ) {
      throw new ForbiddenException('A stream-specific appointment cannot perform a whole-class action.');
    }
    const match = scope.entries.find((entry) => (
      (!normalizedClassSectionId || entry.class_section_id === normalizedClassSectionId)
      && (!normalizedStreamId || entry.stream_id === normalizedStreamId)
    ));
    if (!match) {
      throw new ForbiddenException('The selected class or stream is outside this grade or form master appointment.');
    }
    return match;
  }

  private async requireScopedCase(tenantId: string, scope: GradeMasterScope, caseId: string) {
    const normalizedCaseId = this.requireUuid(caseId, 'Discipline case');
    const { rows } = await this.executeSql(
      `
        SELECT
          incident.id::text AS case_id,
          incident.student_id::text AS learner_id,
          assignment.class_section_id::text,
          assignment.stream_id::text
        FROM discipline_incidents incident
        JOIN student_class_assignments assignment
          ON assignment.tenant_id = incident.tenant_id::text
         AND assignment.student_id::text = incident.student_id::text
         AND assignment.status = 'active'
        WHERE incident.tenant_id::text = $1
          AND incident.id::text = $2
          AND ${this.assignmentScope('assignment', '$3', '$4')}
        LIMIT 1
      `,
      [tenantId, normalizedCaseId, scope.sectionWideClassIds, scope.streamIds],
    );
    if (!rows[0]) {
      throw new ForbiddenException('The selected discipline case is outside this grade or form master appointment.');
    }
    return rows[0];
  }

  private async requireScopedMeeting(tenantId: string, scope: GradeMasterScope, meetingId: string) {
    const normalizedMeetingId = this.requireUuid(meetingId, 'Meeting');
    const { rows } = await this.executeSql(
      `
        SELECT
          meeting.id::text AS meeting_id,
          meeting.student_id::text AS learner_id,
          meeting.guardian_id::text,
          assignment.class_section_id::text,
          assignment.stream_id::text
        FROM parent_meetings meeting
        JOIN student_class_assignments assignment
          ON assignment.tenant_id = meeting.tenant_id
         AND assignment.student_id::text = meeting.student_id::text
         AND assignment.status = 'active'
        WHERE meeting.tenant_id = $1
          AND meeting.id::text = $2
          AND ${this.assignmentScope('assignment', '$3', '$4')}
        LIMIT 1
      `,
      [tenantId, normalizedMeetingId, scope.sectionWideClassIds, scope.streamIds],
    );
    if (!rows[0]) {
      throw new ForbiddenException('The selected meeting is outside this grade or form master appointment.');
    }
    return rows[0];
  }

  private async requireScopedRequest(tenantId: string, scope: GradeMasterScope, requestId: string) {
    const normalizedRequestId = this.requireUuid(requestId, 'Grade workflow request');
    const { rows } = await this.executeSql(
      `
        WITH assigned_learners AS (
          SELECT DISTINCT assignment.student_id::text
          FROM student_class_assignments assignment
          WHERE assignment.tenant_id = $1
            AND assignment.status = 'active'
            AND ${this.assignmentScope('assignment', '$3', '$4')}
        )
        SELECT
          event.id::text AS request_id,
          event.payload->>'learner_id' AS learner_id,
          event.payload->>'class_section_id' AS class_section_id,
          event.payload->>'stream_id' AS stream_id
        FROM workflow_events event
        WHERE event.tenant_id = $1
          AND event.id = $2::uuid
          AND event.event_type LIKE 'grade_master.%'
          AND (
            event.payload->>'learner_id' IN (SELECT student_id FROM assigned_learners)
            OR event.payload->>'class_section_id' = ANY($5::text[])
            OR event.payload->>'stream_id' = ANY($4::text[])
          )
        LIMIT 1
      `,
      [tenantId, normalizedRequestId, scope.sectionWideClassIds, scope.streamIds, scope.classSectionIds],
    );
    if (!rows[0]) {
      throw new ForbiddenException('The selected workflow request is outside this grade or form master appointment.');
    }
    return rows[0];
  }

  async recordAction(tenantId: string, userId: string, body: any) {
    const scope = await this.requireScope(tenantId, userId, body?.gradeLevelId);
    const action = this.requireText(body?.action, 'Action', 100).toLowerCase().replace(/[^a-z0-9_]+/g, '_');
    const allowedRoles = ALLOWED_ACTION_ROLES[action];
    if (!allowedRoles) throw new BadRequestException('This grade-master action is not supported.');

    const title = this.requireText(body?.title, 'Title', 200);
    const message = this.requireText(body?.message, 'Message', 2000);
    const priority = String(body?.priority ?? 'normal').trim().toLowerCase();
    if (!['normal', 'high', 'urgent'].includes(priority)) {
      throw new BadRequestException('Priority must be normal, high, or urgent.');
    }

    const requestedRoles: string[] = Array.isArray(body?.targetRoles)
      ? [...new Set<string>(body.targetRoles
          .map((role: unknown): string => this.normalizeRole(role))
          .filter((role: string): boolean => Boolean(role)))]
      : [];
    if (requestedRoles.some((role) => !GRADE_MASTER_STAFF_ROLES.has(role) || !allowedRoles.includes(role))) {
      throw new BadRequestException('One or more target roles are not allowed for this grade-master action.');
    }
    const targetRoles = requestedRoles.length > 0 ? requestedRoles : allowedRoles;

    const inputPayload = body?.payload && typeof body.payload === 'object' && !Array.isArray(body.payload)
      ? { ...body.payload }
      : {};
    for (const key of [
      'learner',
      'admissionNumber',
      'admission_number',
      'stream',
      'guardian',
      'caseNo',
      'case_no',
      'meetingTitle',
      'subject',
      'recipient',
      'phone',
      'parentPhone',
      'guardianPhone',
      'email',
      'parentEmail',
      'guardianEmail',
    ]) {
      if (inputPayload[key] != null) {
        throw new BadRequestException(`Use the canonical ${key} identifier instead of free-text ${key}.`);
      }
    }

    let learnerId = String(inputPayload.learnerId ?? inputPayload.learner_id ?? '').trim() || null;
    let guardianId = String(inputPayload.guardianId ?? inputPayload.guardian_id ?? '').trim() || null;
    let classSectionId = String(inputPayload.classSectionId ?? inputPayload.class_section_id ?? '').trim() || null;
    let streamId = String(inputPayload.streamId ?? inputPayload.stream_id ?? '').trim() || null;
    const recipientUserId = String(inputPayload.recipientUserId ?? inputPayload.recipient_user_id ?? '').trim() || null;
    const subjectId = String(inputPayload.subjectId ?? inputPayload.subject_id ?? '').trim() || null;
    const caseId = String(inputPayload.caseId ?? inputPayload.case_id ?? '').trim() || null;
    const meetingId = String(inputPayload.meetingId ?? inputPayload.meeting_id ?? '').trim() || null;
    const requestId = String(inputPayload.requestId ?? inputPayload.request_id ?? '').trim() || null;

    if (caseId) {
      const incident = await this.requireScopedCase(tenantId, scope, caseId);
      learnerId = String(incident.learner_id);
      classSectionId = String(incident.class_section_id);
      streamId = String(incident.stream_id ?? '').trim() || null;
    }
    if (meetingId) {
      const meeting = await this.requireScopedMeeting(tenantId, scope, meetingId);
      learnerId = String(meeting.learner_id);
      guardianId = String(meeting.guardian_id ?? '').trim() || guardianId;
      classSectionId = String(meeting.class_section_id);
      streamId = String(meeting.stream_id ?? '').trim() || null;
    }
    if (requestId) {
      const request = await this.requireScopedRequest(tenantId, scope, requestId);
      learnerId = String(request.learner_id ?? '').trim() || learnerId;
      classSectionId = String(request.class_section_id ?? '').trim() || classSectionId;
      streamId = String(request.stream_id ?? '').trim() || streamId;
    }

    const learnerRequiredActions = new Set([
      'parent_message_sent',
      'parent_attendance_message_sent',
      'learner_follow_up_recorded',
      'learner_meeting_scheduled',
      'learner_concern_recorded',
      'deputy_escalation_requested',
      'grade_note_added',
      'attendance_reason_recorded',
      'discipline_incident_referral_requested',
      'class_teacher_welfare_notification_sent',
    ]);
    if (learnerRequiredActions.has(action) && !learnerId) {
      throw new BadRequestException('A canonical learnerId is required for this action.');
    }
    if (action === 'bulk_notice' && !classSectionId && !streamId) {
      throw new BadRequestException('A canonical classSectionId or streamId is required for a bulk notice.');
    }
    if (['discipline_resolution_requested', 'discipline_escalation_requested'].includes(action) && !caseId) {
      throw new BadRequestException('A canonical caseId is required for this discipline action.');
    }
    if (action === 'learner_meeting_rescheduled' && !meetingId) {
      throw new BadRequestException('A canonical meetingId is required to reschedule a meeting.');
    }
    if (action === 'academic_intervention_requested' && !subjectId) {
      throw new BadRequestException('A canonical subjectId is required for an academic intervention.');
    }
    if (action === 'add_comment' && !requestId) {
      throw new BadRequestException('A canonical requestId is required to add a workflow comment.');
    }
    if (['learner_meeting_scheduled', 'learner_meeting_rescheduled'].includes(action)) {
      const meetingDate = this.requireIsoDate(
        inputPayload.meetingDate ?? inputPayload.meeting_date,
        'Meeting date',
      );
      const startTime = String(inputPayload.startTime ?? inputPayload.start_time ?? '').trim();
      const endTime = String(inputPayload.endTime ?? inputPayload.end_time ?? '').trim();
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime)) {
        throw new BadRequestException('Meeting start and end times must use HH:MM.');
      }
      if (endTime <= startTime) throw new BadRequestException('Meeting end time must be after the start time.');
      inputPayload.meeting_date = meetingDate;
      inputPayload.start_time = startTime;
      inputPayload.end_time = endTime;
      if (action === 'learner_meeting_rescheduled') {
        inputPayload.notes = this.requireText(inputPayload.reason, 'Reschedule reason', 1000);
      }
      delete inputPayload.meetingDate;
      delete inputPayload.startTime;
      delete inputPayload.endTime;
    }

    const classScopedActions = new Set([
      'teacher_message',
      'academic_intervention_requested',
      'request_comments',
      'message_teacher',
      'report_approval_requested',
      'bulk_notice',
    ]);
    if (classScopedActions.has(action) && !learnerId && !classSectionId && !streamId) {
      throw new BadRequestException('A canonical classSectionId or streamId is required for this action.');
    }
    if (action === 'attendance_reason_recorded') {
      inputPayload.reason = this.requireText(inputPayload.reason, 'Attendance reason', 1000);
    }
    if (action === 'learner_follow_up_recorded') {
      inputPayload.reason = this.requireText(inputPayload.reason, 'Follow-up reason', 1000);
    }
    if (action === 'grade_note_added') {
      inputPayload.note = this.requireText(inputPayload.note, 'Grade note', 2000);
    }
    if (action === 'learner_meeting_scheduled') {
      inputPayload.agenda = this.requireText(inputPayload.agenda, 'Meeting agenda', 1000);
    }

    if (learnerId) {
      const learner = await this.requireScopedLearner(tenantId, scope, learnerId);
      classSectionId = String(learner.class_section_id);
      streamId = String(learner.stream_id ?? '').trim() || null;
    }
    this.requireScopedClassOrStream(scope, classSectionId, streamId);
    if (guardianId) this.requireUuid(guardianId, 'Guardian');
    if (recipientUserId) this.requireUuid(recipientUserId, 'Staff recipient');
    if (subjectId) this.requireUuid(subjectId, 'Subject');

    const exactGuardianDelivery = EXACT_GUARDIAN_ACTIONS.has(action);
    const exactStaffDelivery = EXACT_STAFF_ACTIONS.has(action)
      && targetRoles.some((role) => role === 'class_teacher' || role === 'teacher');
    if (recipientUserId && !exactStaffDelivery) {
      throw new BadRequestException('A staff recipient is not supported for this grade-master action.');
    }
    if (guardianId && !exactGuardianDelivery) {
      throw new BadRequestException('A guardian recipient is not supported for this grade-master action.');
    }
    if (exactStaffDelivery && !recipientUserId) {
      throw new BadRequestException('A canonical recipientUserId is required for this staff message.');
    }
    const bulkGuardianDelivery = action === 'bulk_notice';
    const entityType = requestId
      ? 'workflow_event'
      : caseId
      ? 'discipline_case'
      : meetingId
        ? 'parent_meeting'
        : learnerId
          ? 'student'
          : streamId
            ? 'class_stream'
            : classSectionId
              ? 'class_section'
              : 'grade_master_action';
    const entityId = requestId ?? caseId ?? meetingId ?? learnerId ?? streamId ?? classSectionId ?? action;
    const eventTargetRoles = (exactStaffDelivery
      ? targetRoles.filter((role) => role !== 'class_teacher' && role !== 'teacher')
      : targetRoles)
      .filter((role) => role !== 'grade_master');
    const payload = {
      ...inputPayload,
      learnerId: undefined,
      learner_id: learnerId,
      guardianId: undefined,
      guardian_id: guardianId,
      classSectionId: undefined,
      class_section_id: classSectionId,
      streamId: undefined,
      stream_id: streamId,
      recipientUserId: exactStaffDelivery && eventTargetRoles.length === 0 ? recipientUserId : undefined,
      recipient_user_id: recipientUserId,
      subjectId: undefined,
      subject_id: subjectId,
      caseId: undefined,
      case_id: caseId,
      meetingId: undefined,
      meeting_id: meetingId,
      requestId: undefined,
      request_id: requestId,
      action,
      source_dashboard: 'grade-master-command',
    };

    const result = await this.executeSql(
      `
        WITH active_appointments AS (
          SELECT appointment.*
          FROM academics_role_appointments appointment
          JOIN tenant_memberships membership
            ON membership.tenant_id = appointment.tenant_id
           AND membership.user_id = appointment.teacher_user_id
           AND membership.status = 'active'
          WHERE appointment.tenant_id = $1
            AND appointment.teacher_user_id = $2::uuid
            AND appointment.role_type IN ('grade_master', 'form_master')
            AND appointment.status = 'active'
            AND (appointment.effective_from IS NULL OR appointment.effective_from::date <= CURRENT_DATE)
            AND (appointment.effective_to IS NULL OR appointment.effective_to::date >= CURRENT_DATE)
        ), active_scope AS (
          SELECT
            section.id::text AS class_section_id,
            stream.id::text AS stream_id,
            TRUE AS is_section_wide
          FROM active_appointments appointment
          JOIN class_sections section
            ON section.tenant_id = appointment.tenant_id
           AND section.id::text = appointment.class_section_id::text
           AND section.is_active = TRUE
           AND (appointment.academic_year_id IS NULL OR section.academic_year_id::text = appointment.academic_year_id::text)
          LEFT JOIN class_streams stream
            ON stream.tenant_id = section.tenant_id
           AND stream.class_section_id::text = section.id::text
           AND stream.is_active = TRUE
          WHERE appointment.stream_id IS NULL
            AND appointment.class_section_id IS NOT NULL

          UNION

          SELECT
            section.id::text AS class_section_id,
            stream.id::text AS stream_id,
            FALSE AS is_section_wide
          FROM active_appointments appointment
          JOIN class_streams stream
            ON stream.tenant_id = appointment.tenant_id
           AND stream.id::text = appointment.stream_id::text
           AND stream.is_active = TRUE
          JOIN class_sections section
            ON section.tenant_id = stream.tenant_id
           AND section.id::text = stream.class_section_id::text
           AND section.is_active = TRUE
           AND (appointment.academic_year_id IS NULL OR section.academic_year_id::text = appointment.academic_year_id::text)
           AND (appointment.class_section_id IS NULL OR section.id::text = appointment.class_section_id::text)
          WHERE appointment.stream_id IS NOT NULL
        ), active_actor AS (
          SELECT 1 FROM active_scope LIMIT 1
        ), scoped_students AS (
          SELECT DISTINCT assignment.student_id::text, assignment.class_section_id::text, assignment.stream_id::text
          FROM student_class_assignments assignment
          JOIN students student
            ON student.tenant_id = assignment.tenant_id
           AND student.id = assignment.student_id
           AND student.deleted_at IS NULL
          WHERE assignment.tenant_id = $1
            AND assignment.status = 'active'
            AND ${this.assignmentScope('assignment', '$11', '$12')}
            AND EXISTS (
              SELECT 1
              FROM active_scope current_scope
              WHERE (
                current_scope.is_section_wide = TRUE
                AND current_scope.class_section_id = assignment.class_section_id::text
              ) OR (
                current_scope.stream_id IS NOT NULL
                AND current_scope.stream_id = assignment.stream_id::text
              )
            )
            AND ($13::text IS NULL OR assignment.student_id::text = $13)
            AND ($14::text IS NULL OR assignment.class_section_id::text = $14)
            AND ($15::text IS NULL OR assignment.stream_id::text = $15)
        ), guardian_recipients AS (
          SELECT DISTINCT guardian.id, guardian.user_id, guardian.student_id::text, guardian.is_primary
          FROM scoped_students scoped
          JOIN student_guardians guardian
            ON guardian.tenant_id = $1
           AND guardian.student_id::text = scoped.student_id
           AND guardian.status = 'active'
           AND guardian.user_id IS NOT NULL
          JOIN tenant_memberships membership
            ON membership.tenant_id = guardian.tenant_id
           AND membership.user_id = guardian.user_id
           AND membership.status = 'active'
          WHERE $16::boolean = TRUE
            AND ($17::uuid IS NULL OR guardian.id = $17::uuid)
        ), eligible_staff_recipients AS (
          SELECT DISTINCT
            membership.user_id,
            'class_teacher'::text AS recipient_role
          FROM tenant_memberships membership
          JOIN class_streams class_stream
            ON class_stream.tenant_id = membership.tenant_id
           AND class_stream.class_teacher_id = membership.user_id
           AND class_stream.is_active = TRUE
          WHERE $20::boolean = TRUE
            AND membership.tenant_id = $1
            AND membership.user_id = $19::uuid
            AND membership.status = 'active'
            AND $3::jsonb ? 'class_teacher'
            AND ($14::text IS NULL OR class_stream.class_section_id::text = $14)
            AND ($15::text IS NULL OR class_stream.id::text = $15)
            AND EXISTS (
              SELECT 1
              FROM active_scope current_scope
              WHERE current_scope.class_section_id = class_stream.class_section_id::text
                AND (current_scope.is_section_wide = TRUE OR current_scope.stream_id = class_stream.id::text)
            )

          UNION

          SELECT DISTINCT
            membership.user_id,
            'teacher'::text AS recipient_role
          FROM tenant_memberships membership
          JOIN teacher_subject_assignments teacher_assignment
            ON teacher_assignment.tenant_id = membership.tenant_id
           AND teacher_assignment.teacher_user_id::text = membership.user_id::text
           AND teacher_assignment.status = 'active'
          WHERE $20::boolean = TRUE
            AND membership.tenant_id = $1
            AND membership.user_id = $19::uuid
            AND membership.status = 'active'
            AND $3::jsonb ? 'teacher'
            AND ($14::text IS NULL OR teacher_assignment.class_section_id::text = $14)
            AND ($15::text IS NULL OR teacher_assignment.stream_id::text = $15)
            AND ($10::jsonb->>'subject_id' IS NULL OR teacher_assignment.subject_id::text = $10::jsonb->>'subject_id')
            AND EXISTS (
              SELECT 1
              FROM active_scope current_scope
              WHERE current_scope.class_section_id = teacher_assignment.class_section_id::text
                AND (
                  current_scope.is_section_wide = TRUE
                  OR current_scope.stream_id = teacher_assignment.stream_id::text
                )
            )
        ), exact_staff_recipient AS (
          SELECT user_id, recipient_role
          FROM eligible_staff_recipients
          ORDER BY CASE recipient_role WHEN 'class_teacher' THEN 0 ELSE 1 END
          LIMIT 1
        ), selected_guardian_recipient AS (
          SELECT recipient.*
          FROM guardian_recipients recipient
          ORDER BY recipient.is_primary DESC, recipient.id
          LIMIT 1
        ), guardian_delivery_recipients AS (
          SELECT recipient.*
          FROM guardian_recipients recipient
          WHERE $4 <> 'grade_master.learner_meeting_scheduled'

          UNION ALL

          SELECT recipient.*
          FROM selected_guardian_recipient recipient
          WHERE $4 = 'grade_master.learner_meeting_scheduled'
        ), scheduled_meeting AS (
          INSERT INTO parent_meetings (
            tenant_id, student_id, guardian_id, reason, meeting_type, meeting_date,
            start_time, end_time, location, status, notes, created_by_user_id
          )
          SELECT
            $1,
            scoped.student_id,
            recipient.id,
            COALESCE(NULLIF($10::jsonb->>'agenda', ''), $7),
            'grade_master_follow_up',
            ($10::jsonb->>'meeting_date')::date,
            $10::jsonb->>'start_time',
            $10::jsonb->>'end_time',
            NULLIF($10::jsonb->>'location', ''),
            'scheduled',
            NULLIF($10::jsonb->>'notes', ''),
            $2::uuid
          FROM scoped_students scoped
          JOIN selected_guardian_recipient recipient ON recipient.student_id = scoped.student_id
          CROSS JOIN active_actor
          WHERE $4 = 'grade_master.learner_meeting_scheduled'
          ORDER BY recipient.is_primary DESC, recipient.id
          LIMIT 1
          RETURNING id::text
        ), rescheduled_meeting AS (
          UPDATE parent_meetings meeting
          SET
            meeting_date = ($10::jsonb->>'meeting_date')::date,
            start_time = $10::jsonb->>'start_time',
            end_time = $10::jsonb->>'end_time',
            reason = COALESCE(NULLIF($10::jsonb->>'agenda', ''), meeting.reason),
            notes = COALESCE(NULLIF($10::jsonb->>'notes', ''), meeting.notes),
            updated_at = NOW()
          WHERE $4 = 'grade_master.learner_meeting_rescheduled'
            AND meeting.tenant_id = $1
            AND meeting.id::text = $6
            AND EXISTS (SELECT 1 FROM active_actor)
            AND EXISTS (
              SELECT 1 FROM scoped_students scoped
              WHERE scoped.student_id = meeting.student_id::text
            )
          RETURNING meeting.id::text
        ), scope_gate AS (
          SELECT EXISTS (
            SELECT 1
            FROM active_scope current_scope
            WHERE ($14::text IS NULL OR current_scope.class_section_id = $14)
              AND ($15::text IS NULL OR current_scope.stream_id = $15)
          ) AS allowed
        ), recipient_gate AS (
          SELECT
            CASE WHEN $16::boolean = FALSE THEN TRUE ELSE EXISTS (SELECT 1 FROM guardian_delivery_recipients) END AS allowed,
            CASE WHEN $18::boolean = FALSE THEN TRUE ELSE EXISTS (SELECT 1 FROM scoped_students) END AS student_allowed,
            CASE WHEN $20::boolean = FALSE THEN TRUE ELSE EXISTS (SELECT 1 FROM exact_staff_recipient) END AS staff_allowed,
            (SELECT allowed FROM scope_gate) AS scope_allowed,
            CASE
              WHEN $4 = 'grade_master.learner_meeting_scheduled' THEN EXISTS (SELECT 1 FROM scheduled_meeting)
              WHEN $4 = 'grade_master.learner_meeting_rescheduled' THEN EXISTS (SELECT 1 FROM rescheduled_meeting)
              ELSE TRUE
            END AS domain_write_allowed
        ), inserted_event AS (
          INSERT INTO workflow_events (
            tenant_id, source_user_id, source_role, target_roles, event_type,
            entity_type, entity_id, title, message, priority, status, payload
          )
          SELECT $1, $2::uuid, 'grade_master', $21::jsonb, $4,
                 $5, $6, $7, $8, $9, 'pending', $10::jsonb
          FROM active_actor, recipient_gate
          WHERE recipient_gate.allowed
            AND recipient_gate.student_allowed
            AND recipient_gate.staff_allowed
            AND recipient_gate.scope_allowed
            AND recipient_gate.domain_write_allowed
          RETURNING *
        ), staff_notifications AS (
          INSERT INTO notifications (
            tenant_id, notification_key, recipient_role, type, title, body,
            status, priority, source_module, source_record_id, metadata
          )
          SELECT
            $1,
            CONCAT('grade-master-', inserted_event.id::text, '-role-', role_name),
            role_name,
            $4,
            $7,
            $8,
            'unread',
            $9,
            'grade-master',
            inserted_event.id::text,
            jsonb_build_object('event_id', inserted_event.id, 'target_roles', $3::jsonb) || $10::jsonb
          FROM inserted_event
          CROSS JOIN LATERAL jsonb_array_elements_text($3::jsonb) role_name
          WHERE role_name <> 'grade_master'
            AND ($20::boolean = FALSE OR role_name NOT IN ('class_teacher', 'teacher'))
          ON CONFLICT (tenant_id, notification_key) DO NOTHING
          RETURNING id
        ), exact_staff_notifications AS (
          INSERT INTO notifications (
            tenant_id, notification_key, recipient_user_id, recipient_role, type, title, body,
            status, priority, source_module, source_record_id, metadata
          )
          SELECT
            $1,
            CONCAT('grade-master-', inserted_event.id::text, '-staff-', recipient.user_id::text),
            recipient.user_id,
            recipient.recipient_role,
            $4,
            $7,
            $8,
            'unread',
            $9,
            'grade-master',
            inserted_event.id::text,
            jsonb_build_object(
              'event_id', inserted_event.id,
              'recipient_user_id', recipient.user_id,
              'recipient_role', recipient.recipient_role
            ) || $10::jsonb
          FROM inserted_event
          JOIN exact_staff_recipient recipient ON TRUE
          ON CONFLICT (tenant_id, notification_key) DO NOTHING
          RETURNING id
        ), guardian_notifications AS (
          INSERT INTO notifications (
            tenant_id, notification_key, recipient_user_id, recipient_guardian_id, recipient_role,
            type, title, body, status, priority, source_module, source_record_id, metadata
          )
          SELECT
            $1,
            CONCAT('grade-master-', inserted_event.id::text, '-guardian-', recipient.id::text),
            recipient.user_id,
            recipient.id,
            'parent',
            $4,
            $7,
            $8,
            'unread',
            $9,
            'grade-master',
            inserted_event.id::text,
            jsonb_build_object(
              'event_id', inserted_event.id,
              'learner_id', recipient.student_id,
              'recipient_guardian_id', recipient.id
            ) || $10::jsonb
          FROM inserted_event
          JOIN guardian_delivery_recipients recipient ON TRUE
          ON CONFLICT (tenant_id, notification_key) DO NOTHING
          RETURNING id
        ), inserted_audit AS (
          INSERT INTO audit_logs (
            tenant_id, school_id, actor_user_id, action, module, entity_type,
            entity_id, resource_type, resource_id, reason, metadata
          )
          SELECT
            $1, $1, $2::uuid, $4, 'grade-master', $5, $6,
            $5, inserted_event.id, $8,
            jsonb_build_object(
              'event_id', inserted_event.id,
              'staff_notification_count', (
                (SELECT COUNT(*) FROM staff_notifications)
                + (SELECT COUNT(*) FROM exact_staff_notifications)
              ),
              'guardian_notification_count', (SELECT COUNT(*) FROM guardian_notifications)
            ) || $10::jsonb
          FROM inserted_event
          RETURNING id
        )
        SELECT
          inserted_event.*,
          (
            (SELECT COUNT(*) FROM staff_notifications)
            + (SELECT COUNT(*) FROM exact_staff_notifications)
          )::int AS staff_notification_count,
          (SELECT COUNT(*)::int FROM guardian_notifications) AS guardian_notification_count,
          (SELECT COUNT(*)::int FROM inserted_audit) AS audit_count
        FROM inserted_event
      `,
      [
        tenantId,
        userId,
        JSON.stringify(targetRoles),
        `grade_master.${action}`,
        entityType,
        entityId,
        title,
        message,
        priority,
        JSON.stringify(payload),
        scope.sectionWideClassIds,
        scope.streamIds,
        learnerId,
        classSectionId,
        streamId,
        exactGuardianDelivery,
        guardianId,
        Boolean(learnerId) || bulkGuardianDelivery,
        recipientUserId,
        exactStaffDelivery,
        JSON.stringify(eventTargetRoles),
      ],
    );

    const event = result.rows[0] as any;
    if (!event) {
      if (exactGuardianDelivery) {
        throw new BadRequestException('No active linked guardian with an active school membership could receive this message.');
      }
      if (exactStaffDelivery) {
        throw new BadRequestException('The selected staff account is not actively assigned to this class or stream.');
      }
      throw new ForbiddenException('The grade-master appointment or selected record is no longer active.');
    }
    const guardianCount = Number(event.guardian_notification_count ?? 0);
    const staffCount = Number(event.staff_notification_count ?? 0);
    const responseMessage = guardianCount > 0 && staffCount > 0
      ? `Saved and queued for ${guardianCount} exact guardian recipient${guardianCount === 1 ? '' : 's'}; ${staffCount} authorised staff queue${staffCount === 1 ? '' : 's'} updated.`
      : guardianCount > 0
        ? `Saved and queued for ${guardianCount} exact guardian recipient${guardianCount === 1 ? '' : 's'}.`
        : staffCount > 0
          ? `Saved and queued for ${staffCount} authorised staff recipient${staffCount === 1 ? '' : 's'}.`
          : 'Saved with an audit trail; no additional recipient notification was required.';
    return {
      success: true,
      event,
      message: responseMessage,
      guardian_notification_count: guardianCount,
      staff_notification_count: staffCount,
    };
  }
}
