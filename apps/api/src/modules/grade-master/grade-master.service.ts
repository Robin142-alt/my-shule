import { BadRequestException, Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

type GradeMasterRow = Record<string, any>;

@Injectable()
export class GradeMasterService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeGradeLevelId(gradeLevelId?: string | null) {
    const normalized = String(gradeLevelId ?? '').trim();
    return normalized.length > 0 ? normalized : null;
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

  async getOverview(tenantId: string, _userId: string, gradeLevelId?: string | null) {
    const query = `
      WITH grade_learners AS (
        SELECT
          assignment.tenant_id,
          assignment.student_id,
          assignment.class_section_id,
          section.name AS stream_name
        FROM student_class_assignments assignment
        JOIN class_sections section
          ON section.tenant_id = assignment.tenant_id
         AND section.id = assignment.class_section_id
        WHERE assignment.tenant_id = $1
          AND assignment.status = 'active'
          AND section.is_active = TRUE
          AND (
            $2::text IS NULL
            OR assignment.academic_level_id::text = $2
            OR section.academic_level_id::text = $2
            OR section.grade_level = $2
            OR section.name = $2
          )
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
          ON learner.student_id = marks.student_id
         AND learner.tenant_id = marks.tenant_id::text
        WHERE marks.status IN ('submitted', 'reviewed', 'locked', 'published')
        GROUP BY marks.tenant_id, marks.student_id
        HAVING AVG(marks.score) < 50
      )
      SELECT
        (SELECT COUNT(DISTINCT student_id)::int FROM grade_learners) AS total_learners,
        (SELECT COUNT(DISTINCT learner.student_id)::int FROM grade_learners learner JOIN attendance_today attendance ON attendance.student_id = learner.student_id AND attendance.status = 'present') AS present_today,
        (SELECT COUNT(DISTINCT learner.student_id)::int FROM grade_learners learner JOIN attendance_today attendance ON attendance.student_id = learner.student_id AND attendance.status = 'absent') AS absent_today,
        (SELECT COUNT(DISTINCT learner.student_id)::int FROM grade_learners learner JOIN attendance_today attendance ON attendance.student_id = learner.student_id AND attendance.status = 'late') AS late_today,
        (SELECT COUNT(DISTINCT class_section_id)::int FROM grade_learners) AS streams_covered,
        (
          SELECT COUNT(DISTINCT incident.id)::int
          FROM discipline_incidents incident
          JOIN grade_learners learner
            ON learner.student_id = incident.student_id
           AND learner.tenant_id = incident.tenant_id::text
          WHERE lower(COALESCE(incident.status, 'open')) NOT IN ('closed', 'resolved', 'archived')
        ) AS open_discipline_cases,
        (SELECT COUNT(DISTINCT student_id)::int FROM mark_risk) AS academic_risk_learners,
        (
          SELECT COUNT(DISTINCT invoice.student_id)::int
          FROM student_invoices invoice
          JOIN grade_learners learner
            ON learner.student_id = invoice.student_id
           AND learner.tenant_id = invoice.tenant_id
          WHERE invoice.status IN ('open', 'pending_payment', 'overdue')
            AND invoice.balance_minor > 0
        ) AS fee_arrears_watchlist,
        (
          SELECT COUNT(*)::int
          FROM workflow_events event
          WHERE event.tenant_id = $1
            AND event.event_type LIKE 'grade_master.%'
            AND event.status IN ('pending', 'open')
        ) AS pending_parent_followups,
        (
          SELECT COUNT(DISTINCT review.class_section_id)::int
          FROM report_readiness_reviews review
          JOIN grade_learners learner
            ON learner.class_section_id = review.class_section_id
           AND learner.tenant_id = review.tenant_id::text
          WHERE lower(COALESCE(review.status, 'pending')) NOT IN ('ready', 'approved', 'published')
        ) AS reports_not_ready,
        (
          SELECT COUNT(DISTINCT referral.id)::int
          FROM counselling_referrals referral
          JOIN grade_learners learner
            ON learner.student_id = referral.student_id
           AND learner.tenant_id = referral.tenant_id::text
          WHERE lower(COALESCE(referral.status, 'open')) NOT IN ('closed', 'resolved', 'archived')
        ) AS counselling_referrals,
        (
          SELECT COUNT(DISTINCT section.id)::int
          FROM class_sections section
          LEFT JOIN class_streams stream
            ON stream.tenant_id = section.tenant_id
           AND stream.class_section_id = section.id
           AND stream.is_active = TRUE
          WHERE section.tenant_id = $1
            AND section.is_active = TRUE
            AND (
              $2::text IS NULL
              OR section.academic_level_id::text = $2
              OR section.grade_level = $2
              OR section.name = $2
            )
            AND stream.class_teacher_id IS NULL
        ) AS class_teacher_pending_updates
    `;
    const { rows } = await this.executeSql(query, [tenantId, this.normalizeGradeLevelId(gradeLevelId)]);
    return rows[0] ?? {
      total_learners: 0,
      present_today: 0,
      absent_today: 0,
      late_today: 0,
      streams_covered: 0,
      open_discipline_cases: 0,
      academic_risk_learners: 0,
      fee_arrears_watchlist: 0,
      pending_parent_followups: 0,
      reports_not_ready: 0,
      counselling_referrals: 0,
      class_teacher_pending_updates: 0,
    };
  }

  async getLearners(tenantId: string, _userId: string, gradeLevelId?: string | null) {
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
        WHERE marks.status IN ('submitted', 'reviewed', 'locked', 'published')
        GROUP BY marks.tenant_id, marks.student_id
      )
      SELECT
        student.id::text,
        student.admission_number,
        trim(student.first_name || ' ' || COALESCE(student.middle_name || ' ', '') || student.last_name) AS learner,
        section.name AS stream,
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
      LEFT JOIN attendance_stats attendance
        ON attendance.tenant_id = assignment.tenant_id
       AND attendance.student_id = assignment.student_id
      LEFT JOIN mark_stats mark
        ON mark.tenant_id = assignment.tenant_id
       AND mark.student_id = assignment.student_id
      WHERE assignment.tenant_id = $1
        AND assignment.status = 'active'
        AND student.deleted_at IS NULL
        AND (
          $2::text IS NULL
          OR assignment.academic_level_id::text = $2
          OR section.academic_level_id::text = $2
          OR section.grade_level = $2
          OR section.name = $2
        )
      ORDER BY section.name ASC, student.first_name ASC, student.last_name ASC
      LIMIT 500
    `;
    const { rows } = await this.executeSql(query, [tenantId, this.normalizeGradeLevelId(gradeLevelId)]);
    return rows.map((row) => ({
      id: row.id,
      admission_number: row.admission_number,
      learner: row.learner,
      stream: row.stream,
      attendance: this.percent(row.attendance_percentage),
      average: this.percent(row.average_score),
      risk: row.risk,
    }));
  }

  async getStreams(tenantId: string, _userId: string, gradeLevelId?: string | null) {
    const query = `
      SELECT
        section.id::text,
        section.name AS stream,
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
      LEFT JOIN academics_attendance attendance
        ON attendance.tenant_id = section.tenant_id
       AND attendance.student_id = assignment.student_id
       AND attendance.attendance_date = CURRENT_DATE
      LEFT JOIN discipline_incidents incident
        ON incident.tenant_id::text = section.tenant_id
       AND incident.student_id = assignment.student_id
       AND lower(COALESCE(incident.status, 'open')) NOT IN ('closed', 'resolved', 'archived')
      WHERE section.tenant_id = $1
        AND section.is_active = TRUE
        AND (
          $2::text IS NULL
          OR section.academic_level_id::text = $2
          OR section.grade_level = $2
          OR section.name = $2
        )
      GROUP BY section.id, section.name, profile.display_name, staff.full_name
      ORDER BY section.name ASC
    `;
    const { rows } = await this.executeSql(query, [tenantId, this.normalizeGradeLevelId(gradeLevelId)]);
    return rows.map((row) => ({
      ...row,
      last_update: row.last_update ? this.date(row.last_update) : 'No attendance today',
    }));
  }

  async getAttendance(tenantId: string, _userId: string, gradeLevelId?: string | null) {
    const query = `
      SELECT
        student.id::text,
        trim(student.first_name || ' ' || student.last_name) AS learner,
        section.name AS stream,
        COALESCE(attendance.status, 'unmarked') AS status,
        'Unknown' AS reason,
        COUNT(history.id) FILTER (WHERE lower(history.status) IN ('absent', 'late'))::int AS absence_count
      FROM student_class_assignments assignment
      JOIN students student
        ON student.tenant_id = assignment.tenant_id
       AND student.id = assignment.student_id
      JOIN class_sections section
        ON section.tenant_id = assignment.tenant_id
       AND section.id = assignment.class_section_id
      LEFT JOIN academics_attendance attendance
        ON attendance.tenant_id = assignment.tenant_id
       AND attendance.student_id = assignment.student_id
       AND attendance.attendance_date = CURRENT_DATE
      LEFT JOIN academics_attendance history
        ON history.tenant_id = assignment.tenant_id
       AND history.student_id = assignment.student_id
       AND history.attendance_date >= CURRENT_DATE - interval '90 days'
      WHERE assignment.tenant_id = $1
        AND assignment.status = 'active'
        AND (
          $2::text IS NULL
          OR assignment.academic_level_id::text = $2
          OR section.academic_level_id::text = $2
          OR section.grade_level = $2
          OR section.name = $2
        )
        AND COALESCE(lower(attendance.status), 'unmarked') <> 'present'
      GROUP BY student.id, student.first_name, student.last_name, section.name, attendance.status
      ORDER BY absence_count DESC, learner ASC
      LIMIT 100
    `;
    const { rows } = await this.executeSql(query, [tenantId, this.normalizeGradeLevelId(gradeLevelId)]);
    return rows;
  }

  async getAcademics(tenantId: string, _userId: string, gradeLevelId?: string | null) {
    const query = `
      SELECT
        subject.id::text,
        subject.name AS subject,
        COALESCE(profile.display_name, staff.full_name, 'Unassigned') AS teacher,
        ROUND(AVG(mark.score))::int AS average_score,
        COUNT(mark.id) FILTER (WHERE lower(mark.status) IN ('draft', 'missing'))::int AS missing_marks,
        COUNT(DISTINCT mark.student_id) FILTER (WHERE mark.score < 50)::int AS at_risk
      FROM teacher_subject_assignments teacher_assignment
      JOIN subjects subject
        ON subject.tenant_id = teacher_assignment.tenant_id
       AND subject.id = teacher_assignment.subject_id
      JOIN class_sections section
        ON section.tenant_id = teacher_assignment.tenant_id
       AND section.id = teacher_assignment.class_section_id
      LEFT JOIN staff_profiles profile
        ON profile.tenant_id = teacher_assignment.tenant_id
       AND profile.user_id = teacher_assignment.teacher_user_id
      LEFT JOIN staff_members staff
        ON staff.tenant_id = teacher_assignment.tenant_id
       AND staff.user_id = teacher_assignment.teacher_user_id
      LEFT JOIN exam_marks mark
        ON mark.tenant_id::text = teacher_assignment.tenant_id
       AND mark.class_section_id = teacher_assignment.class_section_id
       AND mark.subject_id = teacher_assignment.subject_id
      WHERE teacher_assignment.tenant_id = $1
        AND teacher_assignment.status = 'active'
        AND (
          $2::text IS NULL
          OR section.academic_level_id::text = $2
          OR section.grade_level = $2
          OR section.name = $2
        )
      GROUP BY subject.id, subject.name, profile.display_name, staff.full_name
      ORDER BY at_risk DESC, average_score ASC NULLS LAST, subject.name ASC
    `;
    const { rows } = await this.executeSql(query, [tenantId, this.normalizeGradeLevelId(gradeLevelId)]);
    return rows.map((row) => ({
      ...row,
      average: this.percent(row.average_score),
    }));
  }

  async getReportReadiness(tenantId: string, _userId: string, gradeLevelId?: string | null) {
    const query = `
      SELECT
        section.id::text,
        section.name AS stream,
        COALESCE(review.status, 'pending') AS status,
        COUNT(DISTINCT comment.student_id)::int AS comments_ready,
        COUNT(DISTINCT assignment.student_id)::int AS total_learners
      FROM class_sections section
      LEFT JOIN student_class_assignments assignment
        ON assignment.tenant_id = section.tenant_id
       AND assignment.class_section_id = section.id
       AND assignment.status = 'active'
      LEFT JOIN report_card_comments comment
        ON comment.tenant_id = section.tenant_id
       AND comment.class_section_id = section.id
       AND comment.student_id = assignment.student_id
       AND lower(comment.comment_status) IN ('submitted', 'approved', 'published')
      LEFT JOIN report_readiness_reviews review
        ON review.tenant_id::text = section.tenant_id
       AND review.class_section_id = section.id
      WHERE section.tenant_id = $1
        AND section.is_active = TRUE
        AND (
          $2::text IS NULL
          OR section.academic_level_id::text = $2
          OR section.grade_level = $2
          OR section.name = $2
        )
      GROUP BY section.id, section.name, review.status
      ORDER BY section.name ASC
    `;
    const { rows } = await this.executeSql(query, [tenantId, this.normalizeGradeLevelId(gradeLevelId)]);
    return rows;
  }

  async getDiscipline(tenantId: string, _userId: string, gradeLevelId?: string | null) {
    const query = `
      SELECT
        incident.id::text,
        incident.id::text AS case_no,
        trim(student.first_name || ' ' || student.last_name) AS learner,
        section.name AS stream,
        COALESCE(incident.severity, 'medium') AS severity,
        COALESCE(incident.status, 'open') AS status
      FROM discipline_incidents incident
      JOIN students student
        ON student.tenant_id = incident.tenant_id::text
       AND student.id = incident.student_id
      JOIN student_class_assignments assignment
        ON assignment.tenant_id = student.tenant_id
       AND assignment.student_id = student.id
       AND assignment.status = 'active'
      JOIN class_sections section
        ON section.tenant_id = assignment.tenant_id
       AND section.id = assignment.class_section_id
      WHERE incident.tenant_id::text = $1
        AND (
          $2::text IS NULL
          OR assignment.academic_level_id::text = $2
          OR section.academic_level_id::text = $2
          OR section.grade_level = $2
          OR section.name = $2
        )
      ORDER BY incident.created_at DESC
      LIMIT 100
    `;
    const { rows } = await this.executeSql(query, [tenantId, this.normalizeGradeLevelId(gradeLevelId)]);
    return rows;
  }

  async getWelfare(tenantId: string, _userId: string, gradeLevelId?: string | null) {
    const query = `
      SELECT
        welfare.id::text,
        trim(student.first_name || ' ' || student.last_name) AS learner,
        section.name AS stream,
        welfare.category AS concern_type,
        'Medium' AS priority,
        'Counsellor' AS assigned_to,
        welfare.status
      FROM student_welfare_cases welfare
      JOIN students student
        ON student.tenant_id = welfare.tenant_id
       AND student.id = welfare.student_id
      JOIN student_class_assignments assignment
        ON assignment.tenant_id = student.tenant_id
       AND assignment.student_id = student.id
       AND assignment.status = 'active'
      JOIN class_sections section
        ON section.tenant_id = assignment.tenant_id
       AND section.id = assignment.class_section_id
      WHERE welfare.tenant_id = $1
        AND (
          $2::text IS NULL
          OR assignment.academic_level_id::text = $2
          OR section.academic_level_id::text = $2
          OR section.grade_level = $2
          OR section.name = $2
        )
      ORDER BY welfare.created_at DESC
      LIMIT 100
    `;
    const { rows } = await this.executeSql(query, [tenantId, this.normalizeGradeLevelId(gradeLevelId)]);
    return rows;
  }

  async getFeesWatchlist(tenantId: string, _userId: string, gradeLevelId?: string | null) {
    const query = `
      SELECT
        student.id::text,
        trim(student.first_name || ' ' || student.last_name) AS learner,
        section.name AS stream,
        COALESCE(SUM(invoice.balance_minor), 0)::bigint AS balance_minor,
        NULL::text AS promise_date
      FROM student_class_assignments assignment
      JOIN students student
        ON student.tenant_id = assignment.tenant_id
       AND student.id = assignment.student_id
      JOIN class_sections section
        ON section.tenant_id = assignment.tenant_id
       AND section.id = assignment.class_section_id
      JOIN student_invoices invoice
        ON invoice.tenant_id = assignment.tenant_id
       AND invoice.student_id = assignment.student_id
       AND invoice.status IN ('open', 'pending_payment', 'overdue')
      WHERE assignment.tenant_id = $1
        AND assignment.status = 'active'
        AND (
          $2::text IS NULL
          OR assignment.academic_level_id::text = $2
          OR section.academic_level_id::text = $2
          OR section.grade_level = $2
          OR section.name = $2
        )
      GROUP BY student.id, student.first_name, student.last_name, section.name
      HAVING COALESCE(SUM(invoice.balance_minor), 0) > 0
      ORDER BY balance_minor DESC, learner ASC
      LIMIT 100
    `;
    const { rows } = await this.executeSql(query, [tenantId, this.normalizeGradeLevelId(gradeLevelId)]);
    return rows.map((row) => ({
      ...row,
      fee_balance: this.money(row.balance_minor),
      promise_date: row.promise_date ?? 'Not recorded',
      report_block: Number(row.balance_minor ?? 0) > 0 ? 'Blocked' : 'Clear',
    }));
  }

  async getCommunications(tenantId: string, _userId: string, gradeLevelId?: string | null) {
    const query = `
      SELECT
        notification.id::text,
        COALESCE(notification.metadata->>'learner', notification.metadata->>'student', 'Grade audience') AS learner,
        COALESCE(notification.metadata->>'guardian', notification.recipient_role, 'Parent/Guardian') AS guardian,
        notification.created_at::text AS last_contacted,
        notification.type AS last_message_type,
        notification.status
      FROM notifications notification
      WHERE notification.tenant_id = $1
        AND notification.type LIKE 'grade_master.%'
        AND (
          $2::text IS NULL
          OR notification.metadata->>'gradeLevelId' = $2
          OR notification.metadata->>'stream' = $2
        )
      ORDER BY notification.created_at DESC
      LIMIT 100
    `;
    const { rows } = await this.executeSql(query, [tenantId, this.normalizeGradeLevelId(gradeLevelId)]);
    return rows.map((row) => ({ ...row, last_contacted: this.date(row.last_contacted) }));
  }

  async getMeetings(tenantId: string, _userId: string, gradeLevelId?: string | null) {
    const query = `
      SELECT
        meeting.id::text,
        meeting.reason AS meeting_title,
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
        AND (
          $2::text IS NULL
          OR assignment.academic_level_id::text = $2
          OR section.academic_level_id::text = $2
          OR section.grade_level = $2
          OR section.name = $2
        )
      ORDER BY meeting.meeting_date DESC, meeting.start_time DESC
      LIMIT 100
    `;
    const { rows } = await this.executeSql(query, [tenantId, this.normalizeGradeLevelId(gradeLevelId)]);
    return rows.map((row) => ({ ...row, date: this.date(row.date) }));
  }

  async getTimetable(tenantId: string, _userId: string, gradeLevelId?: string | null) {
    const query = `
      SELECT
        slot.id::text,
        CASE WHEN slot.day_of_week = EXTRACT(ISODOW FROM CURRENT_DATE)::int THEN 'Today' ELSE slot.day_of_week::text END AS day,
        to_char(slot.start_time, 'HH24:MI') AS time,
        section.name AS stream,
        COALESCE(subject.name, slot.subject_id) AS subject,
        COALESCE(profile.display_name, staff.full_name, 'Unassigned') AS teacher,
        CASE WHEN log.id IS NULL THEN 'Pending' ELSE 'Completed' END AS status
      FROM academics_timetable_slots slot
      JOIN class_sections section
        ON section.tenant_id = slot.tenant_id
       AND section.id::text = slot.class_id
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
          $2::text IS NULL
          OR section.academic_level_id::text = $2
          OR section.grade_level = $2
          OR section.name = $2
        )
      ORDER BY slot.day_of_week ASC, slot.start_time ASC
      LIMIT 100
    `;
    const { rows } = await this.executeSql(query, [tenantId, this.normalizeGradeLevelId(gradeLevelId)]);
    return rows;
  }

  async getAssignments(tenantId: string, _userId: string, gradeLevelId?: string | null) {
    const query = `
      SELECT
        assignment.id::text,
        assignment.title AS assignment,
        COALESCE(subject.name, assignment.subject_id) AS subject,
        section.name AS stream,
        assignment.due_date::text,
        0::int AS missing_count
      FROM academics_assignments assignment
      JOIN class_sections section
        ON section.tenant_id = assignment.tenant_id
       AND section.id::text = assignment.class_id
      LEFT JOIN subjects subject
        ON subject.tenant_id = assignment.tenant_id
       AND subject.id::text = assignment.subject_id
      WHERE assignment.tenant_id = $1
        AND (
          $2::text IS NULL
          OR section.academic_level_id::text = $2
          OR section.grade_level = $2
          OR section.name = $2
        )
      ORDER BY assignment.due_date ASC
      LIMIT 100
    `;
    const { rows } = await this.executeSql(query, [tenantId, this.normalizeGradeLevelId(gradeLevelId)]);
    return rows.map((row: any) => ({ ...row, due_date: this.date(row.due_date) }));
  }

  async getRequests(tenantId: string, _userId: string, gradeLevelId?: string | null) {
    const query = `
      SELECT
        event.id::text,
        event.id::text AS request_no,
        event.event_type AS type,
        COALESCE(event.entity_id, event.payload->>'learner', event.payload->>'stream', 'Grade workflow') AS learner_or_stream,
        COALESCE(event.target_roles->>0, 'grade_master') AS assigned_to,
        event.status
      FROM workflow_events event
      WHERE event.tenant_id = $1
        AND event.event_type LIKE 'grade_master.%'
        AND (
          $2::text IS NULL
          OR event.payload->>'gradeLevelId' = $2
          OR event.payload->>'stream' = $2
        )
      ORDER BY event.created_at DESC
      LIMIT 100
    `;
    const { rows } = await this.executeSql(query, [tenantId, this.normalizeGradeLevelId(gradeLevelId)]);
    return rows;
  }

  async getReports(tenantId: string, _userId: string, gradeLevelId?: string | null) {
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
          $2::text IS NULL
          OR filters->>'gradeLevelId' = $2
          OR filters->>'grade_level_id' = $2
          OR filters->>'grade_level' = $2
        )
      ORDER BY created_at DESC
      LIMIT 50
    `;
    const { rows } = await this.executeSql(query, [tenantId, this.normalizeGradeLevelId(gradeLevelId)]);
    return rows.map((row) => ({
      ...row,
      download_url: `/api/grade-master/reports/${encodeURIComponent(String(row.snapshot_id || row.id))}/download`,
    }));
  }

  async downloadReport(tenantId: string, snapshotId: string) {
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
        LIMIT 1
      `,
      [tenantId, normalizedSnapshotId],
    );

    if (!rows[0]) {
      throw new BadRequestException('The requested grade-master report was not found for this school.');
    }

    return rows[0];
  }

  async getNotifications(tenantId: string, userId: string, gradeLevelId?: string | null) {
    const query = `
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
        AND (
          notification.recipient_user_id::text = $2
          OR notification.recipient_role = 'grade_master'
        )
        AND (
          $3::text IS NULL
          OR notification.metadata->>'gradeLevelId' = $3
          OR notification.metadata->>'stream' = $3
        )
      ORDER BY notification.created_at DESC
      LIMIT 100
    `;
    const { rows } = await this.executeSql(query, [tenantId, userId, this.normalizeGradeLevelId(gradeLevelId)]);
    return rows.map((row) => ({ ...row, created_at: this.date(row.created_at) }));
  }

  async recordAction(tenantId: string, userId: string, body: any) {
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required.');
    }
    if (!userId) {
      throw new BadRequestException('User context is required.');
    }

    const action = String(body?.action ?? 'grade_master_action').trim();
    const title = String(body?.title ?? 'Grade master action').trim();
    const message = String(body?.message ?? `${title} recorded by grade master`).trim();
    const targetRoles = Array.isArray(body?.targetRoles) && body.targetRoles.length > 0
      ? body.targetRoles.map((role: unknown) => String(role))
      : ['grade_master', 'deputy_principal'];
    const payload = {
      ...(body?.payload && typeof body.payload === 'object' ? body.payload : {}),
      action,
      source_dashboard: 'grade-master-command',
    };

    const event = await this.executeSql(
      `
        INSERT INTO workflow_events (
          tenant_id, source_user_id, source_role, target_roles, event_type,
          entity_type, entity_id, title, message, priority, status, payload
        )
        VALUES ($1, $2::uuid, 'grade_master', $3::jsonb, $4, 'grade_master_action', NULL, $5, $6, $7, 'pending', $8::jsonb)
        RETURNING *
      `,
      [
        tenantId,
        userId,
        JSON.stringify(targetRoles),
        `grade_master.${action}`,
        title,
        message,
        body?.priority ?? 'normal',
        JSON.stringify(payload),
      ],
    );
    const eventId = (event.rows[0] as any)?.id;

    await this.executeSql(
      `
        INSERT INTO notifications (
          tenant_id, notification_key, recipient_role, type, title, body, status, metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'unread', $7::jsonb)
        ON CONFLICT (tenant_id, notification_key)
        DO UPDATE SET title = EXCLUDED.title, body = EXCLUDED.body, metadata = EXCLUDED.metadata, updated_at = NOW()
      `,
      [
        tenantId,
        `grade-master-${action}-${eventId ?? Date.now()}`,
        targetRoles[0] ?? 'grade_master',
        `grade_master.${action}`,
        title,
        message,
        JSON.stringify({ event_id: eventId, target_roles: targetRoles, ...payload }),
      ],
    );

    return { success: true, event: event.rows[0] };
  }
}
