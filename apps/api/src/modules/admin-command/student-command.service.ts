import { Injectable, UnauthorizedException } from '@nestjs/common';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';
import { notificationRecipientPredicate } from '../notifications/notification-recipient-predicate';

type StudentIdentity = {
  tenantId: string;
  userId: string;
};

@Injectable()
export class StudentCommandService {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly prisma: PrismaService,
  ) {}

  private requireIdentity(): StudentIdentity {
    const store = this.requestContext.getStore();
    if (!store?.tenant_id || !store.user_id) {
      throw new UnauthorizedException('Authenticated tenant and user context are required');
    }

    return {
      tenantId: store.tenant_id,
      userId: store.user_id,
    };
  }

  private async executeSql<T = Record<string, unknown>>(
    query: string,
    params: unknown[] = [],
  ): Promise<{ rows: T[]; rowCount: number }> {
    return this.prisma.query<T>(query, params);
  }

  async getDashboard() {
    const identity = this.requireIdentity();
    const [profileResult, marksResult] = await Promise.all([
      this.executeSql<{
        id: string;
        student_name: string;
        admission_number: string;
        class_name: string | null;
        status: string;
        attendance_percentage: string | number;
      }>(
        `
          SELECT
            student.id,
            btrim(concat_ws(' ', student.first_name, student.middle_name, student.last_name)) AS student_name,
            student.admission_number,
            class_section.name AS class_name,
            student.status,
            CASE
              WHEN COUNT(attendance.id) = 0 THEN 0
              ELSE ROUND(
                COUNT(attendance.id) FILTER (WHERE attendance.status IN ('present', 'late'))::numeric
                * 100
                / COUNT(attendance.id)::numeric,
                1
              )
            END AS attendance_percentage
          FROM student_portal_access access
          JOIN students student
            ON student.tenant_id = access.tenant_id
           AND student.id = access.student_id
          LEFT JOIN class_sections class_section
            ON class_section.tenant_id = student.tenant_id
           AND class_section.id::text = student.current_class_id::text
          LEFT JOIN attendance_records attendance
            ON attendance.tenant_id = student.tenant_id
           AND attendance.student_id::text = student.id::text
          WHERE access.tenant_id = $1
            AND access.user_id = $2::uuid
            AND access.status = 'active'
            AND student.deleted_at IS NULL
          GROUP BY
            student.id,
            student.first_name,
            student.middle_name,
            student.last_name,
            student.admission_number,
            class_section.name,
            student.status
          LIMIT 1
        `,
        [identity.tenantId, identity.userId],
      ),
      this.executeSql<{
        id: string;
        subject: string;
        teacher: string;
        score: string | number;
        remarks: string | null;
        status: string;
      }>(
        `
          SELECT
            mark.id::text,
            COALESCE(subject.name, 'Subject not linked') AS subject,
            COALESCE(NULLIF(actor.display_name, ''), NULLIF(actor.full_name, ''), actor.email::text, 'Teacher not recorded') AS teacher,
            mark.score,
            mark.remarks,
            mark.status
          FROM student_portal_access access
          JOIN students student
            ON student.tenant_id = access.tenant_id
           AND student.id = access.student_id
          JOIN exam_marks mark
            ON mark.tenant_id = student.tenant_id
           AND mark.student_id::text = student.id::text
          LEFT JOIN subjects subject
            ON subject.tenant_id = mark.tenant_id
           AND subject.id::text = mark.subject_id::text
          LEFT JOIN users actor
            ON actor.id = mark.entered_by_user_id
          WHERE access.tenant_id = $1
            AND access.user_id = $2::uuid
            AND access.status = 'active'
            AND mark.status = 'published'
            AND student.deleted_at IS NULL
          ORDER BY mark.published_at DESC NULLS LAST, mark.updated_at DESC
          LIMIT 100
        `,
        [identity.tenantId, identity.userId],
      ),
    ]);

    const profile = profileResult.rows[0] ?? null;
    const scores = marksResult.rows
      .map((row) => Number(row.score))
      .filter((score) => Number.isFinite(score));

    return {
      student: profile,
      metrics: {
        subjects: new Set(marksResult.rows.map((row) => row.subject)).size,
        attendance: Number(profile?.attendance_percentage ?? 0),
        mean_score: scores.length > 0
          ? Number((scores.reduce((total, score) => total + score, 0) / scores.length).toFixed(2))
          : 0,
      },
      items: marksResult.rows.map((row) => ({
        ...row,
        score: Number(row.score),
        grade: null,
      })),
    };
  }

  async getFees() {
    const identity = this.requireIdentity();
    const [accountResult, invoicesResult, transactionsResult] = await Promise.all([
      this.executeSql<{
        student_id: string;
        admission_number: string;
        student_name: string;
        balance_minor: string | number;
        open_invoices: number;
      }>(
        `
          SELECT
            student.id AS student_id,
            student.admission_number,
            btrim(concat_ws(' ', student.first_name, student.middle_name, student.last_name)) AS student_name,
            COALESCE(SUM(invoice.balance_minor) FILTER (
              WHERE invoice.status NOT IN ('paid', 'cancelled', 'waived')
            ), 0)::bigint AS balance_minor,
            COUNT(invoice.id) FILTER (
              WHERE invoice.status NOT IN ('paid', 'cancelled', 'waived')
            )::int AS open_invoices
          FROM student_portal_access access
          JOIN students student
            ON student.tenant_id = access.tenant_id
           AND student.id = access.student_id
          LEFT JOIN student_invoices invoice
            ON invoice.tenant_id = student.tenant_id
           AND invoice.student_id::text = student.id::text
          WHERE access.tenant_id = $1
            AND access.user_id = $2::uuid
            AND access.status = 'active'
            AND student.deleted_at IS NULL
          GROUP BY student.id, student.admission_number, student.first_name, student.middle_name, student.last_name
          LIMIT 1
        `,
        [identity.tenantId, identity.userId],
      ),
      this.executeSql<{
        id: string;
        invoice_number: string;
        term: string;
        academic_year: string;
        amount_minor: string | number;
        balance_minor: string | number;
        status: string;
        created_at: string;
      }>(
        `
          SELECT
            invoice.id::text,
            invoice.invoice_number,
            invoice.term,
            invoice.academic_year,
            invoice.amount_minor,
            invoice.balance_minor,
            invoice.status,
            invoice.created_at::text
          FROM student_portal_access access
          JOIN students student
            ON student.tenant_id = access.tenant_id
           AND student.id = access.student_id
          JOIN student_invoices invoice
            ON invoice.tenant_id = student.tenant_id
           AND invoice.student_id::text = student.id::text
          WHERE access.tenant_id = $1
            AND access.user_id = $2::uuid
            AND access.status = 'active'
            AND student.deleted_at IS NULL
          ORDER BY invoice.created_at DESC
          LIMIT 100
        `,
        [identity.tenantId, identity.userId],
      ),
      this.executeSql<{
        id: string;
        receipt_number: string;
        payment_method: string;
        amount_minor: string | number;
        status: string;
        received_at: string;
      }>(
        `
          SELECT
            payment.id::text,
            payment.receipt_number,
            payment.payment_method,
            payment.amount_minor,
            payment.status,
            payment.received_at::text
          FROM student_portal_access access
          JOIN students student
            ON student.tenant_id = access.tenant_id
           AND student.id = access.student_id
          JOIN manual_fee_payments payment
            ON payment.tenant_id = student.tenant_id
          LEFT JOIN student_invoices invoice
            ON invoice.tenant_id = payment.tenant_id
           AND invoice.id = payment.invoice_id
          WHERE access.tenant_id = $1
            AND access.user_id = $2::uuid
            AND access.status = 'active'
            AND student.deleted_at IS NULL
            AND COALESCE(payment.student_id::text, invoice.student_id::text) = student.id::text
          ORDER BY payment.received_at DESC
          LIMIT 100
        `,
        [identity.tenantId, identity.userId],
      ),
    ]);

    const account = accountResult.rows[0]
      ? {
          ...accountResult.rows[0],
          balance_minor: Number(accountResult.rows[0].balance_minor ?? 0),
          open_invoices: Number(accountResult.rows[0].open_invoices ?? 0),
        }
      : null;
    const invoices = invoicesResult.rows.map((row) => ({
      ...row,
      amount_minor: Number(row.amount_minor ?? 0),
      balance_minor: Number(row.balance_minor ?? 0),
    }));
    const transactions = transactionsResult.rows.map((row) => ({
      ...row,
      amount_minor: Number(row.amount_minor ?? 0),
      created_at: row.received_at,
    }));

    return {
      metrics: {
        balance_minor: account?.balance_minor ?? 0,
        open_invoices: invoices.filter((invoice) => !['paid', 'cancelled', 'waived'].includes(invoice.status)).length,
        payments: transactions.length,
      },
      account,
      invoices,
      transactions,
    };
  }

  async getAcademics() {
    const identity = this.requireIdentity();
    const [assignmentsResult, marksResult, reportCardsResult] = await Promise.all([
      this.executeSql<{
        id: string;
        title: string;
        description: string | null;
        subject: string;
        teacher: string;
        due_at: string;
        status: string;
        submission_status: string | null;
        submitted_at: string | null;
        completed_at: string | null;
      }>(
        `
          SELECT
            assignment.id::text,
            assignment.title,
            assignment.description,
            COALESCE(subject.name, 'Subject not linked') AS subject,
            COALESCE(
              NULLIF(actor.display_name, ''),
              NULLIF(actor.full_name, ''),
              actor.email::text,
              'Teacher not recorded'
            ) AS teacher,
            assignment.due_date::text AS due_at,
            assignment.status,
            submission.status AS submission_status,
            submission.submitted_at::text,
            submission.completed_at::text
          FROM student_portal_access access
          JOIN students student
            ON student.tenant_id = access.tenant_id
           AND student.id = access.student_id
          JOIN academics_assignments assignment
            ON assignment.tenant_id = student.tenant_id
           AND (
             assignment.class_id = student.current_class_id::text
             OR EXISTS (
               SELECT 1
               FROM student_class_assignments enrollment
               WHERE enrollment.tenant_id = student.tenant_id
                 AND enrollment.student_id = student.id
                 AND enrollment.class_section_id = assignment.class_id
                 AND enrollment.status = 'active'
             )
           )
          LEFT JOIN subjects subject
            ON subject.tenant_id = assignment.tenant_id
           AND subject.id::text = assignment.subject_id
          LEFT JOIN users actor
            ON actor.id = assignment.teacher_id
          LEFT JOIN academics_assignment_submissions submission
            ON submission.tenant_id = assignment.tenant_id
           AND submission.assignment_id = assignment.id
           AND submission.student_id = student.id
          WHERE access.tenant_id = $1
            AND access.user_id = $2::uuid
            AND access.status = 'active'
            AND student.deleted_at IS NULL
            AND lower(assignment.status) IN ('published', 'open', 'active')
          ORDER BY assignment.due_date ASC, assignment.created_at DESC
          LIMIT 250
        `,
        [identity.tenantId, identity.userId],
      ),
      this.executeSql<{
        id: string;
        subject: string;
        exam: string;
        teacher: string;
        score: string | number | null;
        score_status: string;
        remarks: string | null;
        status: string;
        published_at: string | null;
      }>(
        `
          SELECT
            mark.id::text,
            COALESCE(subject.name, 'Subject not linked') AS subject,
            COALESCE(series.name, 'Assessment') AS exam,
            COALESCE(NULLIF(actor.display_name, ''), NULLIF(actor.full_name, ''), actor.email::text, 'Teacher not recorded') AS teacher,
            mark.score,
            mark.score_status,
            mark.remarks,
            mark.status,
            mark.published_at::text
          FROM student_portal_access access
          JOIN students student
            ON student.tenant_id = access.tenant_id
           AND student.id = access.student_id
          JOIN exam_marks mark
            ON mark.tenant_id = student.tenant_id
           AND mark.student_id::text = student.id::text
          LEFT JOIN subjects subject
            ON subject.tenant_id = mark.tenant_id
           AND subject.id::text = mark.subject_id::text
          LEFT JOIN exam_series series
            ON series.tenant_id = mark.tenant_id
           AND series.id = mark.exam_series_id
          LEFT JOIN users actor
            ON actor.id = mark.entered_by_user_id
          WHERE access.tenant_id = $1
            AND access.user_id = $2::uuid
            AND access.status = 'active'
            AND mark.status = 'published'
            AND student.deleted_at IS NULL
          ORDER BY mark.published_at DESC NULLS LAST, mark.updated_at DESC
          LIMIT 250
        `,
        [identity.tenantId, identity.userId],
      ),
      this.executeSql<{
        id: string;
        student_name: string;
        exam_series_name: string;
        academic_year: string | null;
        term: string | null;
        status: string;
        published_at: string | null;
      }>(
        `
          SELECT
            report_card.id::text,
            btrim(concat_ws(' ', student.first_name, student.middle_name, student.last_name)) AS student_name,
            COALESCE(series.name, 'Published report card') AS exam_series_name,
            NULLIF(report_card.metadata->>'academic_year', '') AS academic_year,
            COALESCE(NULLIF(report_card.metadata->>'term', ''), series.name) AS term,
            report_card.status,
            report_card.published_at::text
          FROM student_portal_access access
          JOIN students student
            ON student.tenant_id = access.tenant_id
           AND student.id = access.student_id
          JOIN student_report_cards report_card
            ON report_card.tenant_id = student.tenant_id
           AND report_card.student_id::text = student.id::text
          LEFT JOIN exam_series series
            ON series.tenant_id = report_card.tenant_id
           AND series.id = report_card.exam_series_id
          WHERE access.tenant_id = $1
            AND access.user_id = $2::uuid
            AND access.status = 'active'
            AND report_card.status = 'published'
            AND report_card.is_current = TRUE
            AND student.deleted_at IS NULL
          ORDER BY report_card.published_at DESC NULLS LAST, report_card.updated_at DESC
          LIMIT 100
        `,
        [identity.tenantId, identity.userId],
      ),
    ]);

    const scores = marksResult.rows
      .filter((row) => row.score_status === 'entered' && row.score !== null)
      .map((row) => Number(row.score))
      .filter((score) => Number.isFinite(score));
    const assignments = assignmentsResult.rows.map((assignment) => ({
      ...assignment,
      is_complete: ['submitted', 'completed', 'graded'].includes(
        String(assignment.submission_status ?? '').toLowerCase(),
      ),
    }));

    return {
      metrics: {
        subjects: new Set(marksResult.rows.map((row) => row.subject)).size,
        mean_score: scores.length > 0
          ? Number((scores.reduce((total, score) => total + score, 0) / scores.length).toFixed(2))
          : 0,
        entered_scores: scores.length,
        report_cards: reportCardsResult.rows.length,
        pending_assignments: assignments.filter((assignment) => !assignment.is_complete).length,
      },
      assignments,
      marks: marksResult.rows.map((row) => ({
        ...row,
        score: row.score === null ? null : Number(row.score),
      })),
      report_cards: reportCardsResult.rows.map((row) => ({
        ...row,
        download_url: `/api/student/report-cards/${encodeURIComponent(row.id)}/download`,
      })),
    };
  }

  async getBehavior() {
    const identity = this.requireIdentity();
    const [incidentsResult, commendationsResult, pointsResult] = await Promise.all([
      this.executeSql<{
        id: string;
        title: string;
        description: string;
        severity: string;
        status: string;
        occurred_at: string;
        created_at: string;
      }>(
        `
          SELECT
            incident.id::text,
            incident.title,
            incident.description,
            incident.severity,
            incident.status,
            incident.occurred_at::text,
            incident.created_at::text
          FROM student_portal_access access
          JOIN students student
            ON student.tenant_id = access.tenant_id
           AND student.id = access.student_id
          JOIN discipline_incidents incident
            ON incident.tenant_id = student.tenant_id
           AND incident.student_id::text = student.id::text
          WHERE access.tenant_id = $1
            AND access.user_id = $2::uuid
            AND access.status = 'active'
            AND incident.deleted_at IS NULL
            AND student.deleted_at IS NULL
          ORDER BY incident.occurred_at DESC, incident.created_at DESC
          LIMIT 100
        `,
        [identity.tenantId, identity.userId],
      ),
      this.executeSql<{
        id: string;
        title: string;
        description: string;
        points_delta: number;
        awarded_at: string;
        created_at: string;
      }>(
        `
          SELECT
            commendation.id::text,
            commendation.title,
            commendation.description,
            commendation.points_delta,
            commendation.awarded_at::text,
            commendation.created_at::text
          FROM student_portal_access access
          JOIN students student
            ON student.tenant_id = access.tenant_id
           AND student.id = access.student_id
          JOIN commendations commendation
            ON commendation.tenant_id = student.tenant_id
           AND commendation.student_id::text = student.id::text
          WHERE access.tenant_id = $1
            AND access.user_id = $2::uuid
            AND access.status = 'active'
            AND student.deleted_at IS NULL
          ORDER BY commendation.awarded_at DESC, commendation.created_at DESC
          LIMIT 100
        `,
        [identity.tenantId, identity.userId],
      ),
      this.executeSql<{ behavior_points: number }>(
        `
          SELECT COALESCE(SUM(point.points_delta), 0)::int AS behavior_points
          FROM student_portal_access access
          JOIN students student
            ON student.tenant_id = access.tenant_id
           AND student.id = access.student_id
          JOIN behavior_points point
            ON point.tenant_id = student.tenant_id
           AND point.student_id::text = student.id::text
          WHERE access.tenant_id = $1
            AND access.user_id = $2::uuid
            AND access.status = 'active'
            AND student.deleted_at IS NULL
        `,
        [identity.tenantId, identity.userId],
      ),
    ]);

    return {
      metrics: {
        open_incidents: incidentsResult.rows.filter((incident) => !['resolved', 'closed'].includes(incident.status)).length,
        behavior_points: Number(pointsResult.rows[0]?.behavior_points ?? 0),
        commendations: commendationsResult.rows.length,
      },
      incidents: incidentsResult.rows.map((row) => ({ ...row, kind: 'incident' })),
      commendations: commendationsResult.rows.map((row) => ({
        ...row,
        kind: 'commendation',
        severity: 'commendation',
      })),
    };
  }

  async getDownloads() {
    const identity = this.requireIdentity();
    const result = await this.executeSql<{
      id: string;
      document_name: string;
      term: string;
      date: string | null;
      type: string;
    }>(
      `
        SELECT
          report_card.id::text,
          COALESCE(series.name, 'Published report card') AS document_name,
          COALESCE(NULLIF(report_card.metadata->>'term', ''), series.name, 'Not recorded') AS term,
          report_card.published_at::text AS date,
          'Report card' AS type
        FROM student_portal_access access
        JOIN students student
          ON student.tenant_id = access.tenant_id
         AND student.id = access.student_id
        JOIN student_report_cards report_card
          ON report_card.tenant_id = student.tenant_id
         AND report_card.student_id::text = student.id::text
        LEFT JOIN exam_series series
          ON series.tenant_id = report_card.tenant_id
         AND series.id = report_card.exam_series_id
        WHERE access.tenant_id = $1
          AND access.user_id = $2::uuid
          AND access.status = 'active'
          AND report_card.status = 'published'
          AND student.deleted_at IS NULL
        ORDER BY report_card.published_at DESC NULLS LAST, report_card.updated_at DESC
        LIMIT 100
      `,
      [identity.tenantId, identity.userId],
    );

    return {
      metrics: { available: result.rows.length },
      items: result.rows.map((row) => ({
        ...row,
        download_url: `/api/student/report-cards/${encodeURIComponent(row.id)}/download`,
      })),
    };
  }

  async getMessages() {
    const identity = this.requireIdentity();
    const result = await this.executeSql<{
      id: string;
      from: string;
      subject: string;
      date: string;
      status: string;
    }>(
      `
        SELECT
          notification.id::text,
          COALESCE(NULLIF(notification.source_module, ''), 'School') AS "from",
          notification.title AS subject,
          notification.created_at::text AS date,
          notification.status
        FROM notifications notification
        WHERE notification.tenant_id = $1
          AND ${notificationRecipientPredicate('notification', '$2', '$3')}
          AND (
            notification.type ILIKE '%message%'
            OR notification.type ILIKE '%communication%'
            OR notification.source_module IN ('communication', 'secretary', 'academics', 'finance', 'discipline')
          )
        ORDER BY notification.created_at DESC
        LIMIT 100
      `,
      [identity.tenantId, identity.userId, 'student'],
    );

    return {
      metrics: {
        unread: result.rows.filter((row) => row.status === 'unread').length,
        total: result.rows.length,
      },
      items: result.rows,
    };
  }

  async getNotifications() {
    const identity = this.requireIdentity();
    const result = await this.executeSql<{
      id: string;
      date: string;
      title: string;
      category: string;
      status: string;
      body: string;
      priority: string | null;
    }>(
      `
        SELECT
          notification.id::text,
          notification.created_at::text AS date,
          notification.title,
          COALESCE(NULLIF(notification.source_module, ''), notification.type) AS category,
          notification.status,
          notification.body,
          notification.priority
        FROM notifications notification
        WHERE notification.tenant_id = $1
          AND ${notificationRecipientPredicate('notification', '$2', '$3')}
        ORDER BY notification.created_at DESC
        LIMIT 100
      `,
      [identity.tenantId, identity.userId, 'student'],
    );

    return {
      metrics: {
        unread: result.rows.filter((row) => row.status === 'unread').length,
        total: result.rows.length,
      },
      items: result.rows,
    };
  }
}
