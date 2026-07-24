import { Injectable, UnauthorizedException } from '@nestjs/common';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';

type ParentIdentity = {
  tenantId: string;
  userId: string;
};

type LinkedStudentRow = {
  id: string;
  admission_number: string;
  student_name: string;
  class_name: string | null;
  status: string;
  attendance_percentage: string | number | null;
  balance_minor: string | number | null;
};

@Injectable()
export class ParentCommandService {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly prisma: PrismaService,
  ) {}

  private requireIdentity(): ParentIdentity {
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

  private async getLinkedStudents(identity: ParentIdentity): Promise<LinkedStudentRow[]> {
    const result = await this.executeSql<LinkedStudentRow>(
      `
        SELECT
          student.id,
          student.admission_number,
          btrim(concat_ws(' ', student.first_name, student.middle_name, student.last_name)) AS student_name,
          class_section.name AS class_name,
          student.status,
          COALESCE(attendance.attendance_percentage, 0) AS attendance_percentage,
          COALESCE(fees.balance_minor, 0) AS balance_minor
        FROM student_guardians guardian
        JOIN students student
          ON student.tenant_id = guardian.tenant_id
         AND student.id = guardian.student_id
        LEFT JOIN class_sections class_section
          ON class_section.tenant_id = student.tenant_id
         AND class_section.id::text = student.current_class_id::text
        LEFT JOIN LATERAL (
          SELECT
            CASE
              WHEN COUNT(*) = 0 THEN 0
              ELSE ROUND(
                COUNT(*) FILTER (WHERE record.status IN ('present', 'late'))::numeric
                * 100
                / COUNT(*)::numeric,
                1
              )
            END AS attendance_percentage
          FROM attendance_records record
          WHERE record.tenant_id = student.tenant_id
            AND record.student_id::text = student.id::text
        ) attendance ON TRUE
        LEFT JOIN LATERAL (
          SELECT COALESCE(SUM(invoice.balance_minor), 0)::bigint AS balance_minor
          FROM student_invoices invoice
          WHERE invoice.tenant_id = student.tenant_id
            AND invoice.student_id::text = student.id::text
            AND invoice.status NOT IN ('paid', 'cancelled', 'waived')
        ) fees ON TRUE
        WHERE guardian.tenant_id = $1
          AND guardian.user_id = $2::uuid
          AND guardian.status = 'active'
          AND student.deleted_at IS NULL
        ORDER BY student.first_name, student.last_name, student.admission_number
      `,
      [identity.tenantId, identity.userId],
    );

    return result.rows;
  }

  async getDashboard() {
    const identity = this.requireIdentity();
    const [students, notificationResult] = await Promise.all([
      this.getLinkedStudents(identity),
      this.executeSql<{ unread: number }>(
        `
          SELECT COUNT(*)::int AS unread
          FROM notifications notification
          WHERE notification.tenant_id = $1
            AND notification.recipient_user_id = $2::uuid
            AND notification.status = 'unread'
        `,
        [identity.tenantId, identity.userId],
      ),
    ]);

    return {
      metrics: {
        children: students.length,
        pending_fees: students.filter((student) => Number(student.balance_minor ?? 0) > 0).length,
        notifications: Number(notificationResult.rows[0]?.unread ?? 0),
      },
      items: students.map((student) => ({
        id: student.id,
        child_name: student.student_name,
        class_name: student.class_name ?? 'Class not assigned',
        attendance: `${Number(student.attendance_percentage ?? 0)}%`,
        fee_balance: this.formatMoney(student.balance_minor),
        fee_balance_minor: Number(student.balance_minor ?? 0),
        status: student.status,
      })),
    };
  }

  async getFees() {
    const identity = this.requireIdentity();
    const [accountsResult, invoicesResult, transactionsResult] = await Promise.all([
      this.executeSql<{
        student_id: string;
        admission_number: string;
        student_name: string;
        class_name: string | null;
        balance_minor: string | number;
        open_invoices: number;
      }>(
        `
          WITH linked_students AS (
            SELECT student.*
            FROM student_guardians guardian
            JOIN students student
              ON student.tenant_id = guardian.tenant_id
             AND student.id = guardian.student_id
            WHERE guardian.tenant_id = $1
              AND guardian.user_id = $2::uuid
              AND guardian.status = 'active'
              AND student.deleted_at IS NULL
          )
          SELECT
            student.id AS student_id,
            student.admission_number,
            btrim(concat_ws(' ', student.first_name, student.middle_name, student.last_name)) AS student_name,
            class_section.name AS class_name,
            COALESCE(SUM(invoice.balance_minor) FILTER (
              WHERE invoice.status NOT IN ('paid', 'cancelled', 'waived')
            ), 0)::bigint AS balance_minor,
            COUNT(invoice.id) FILTER (
              WHERE invoice.status NOT IN ('paid', 'cancelled', 'waived')
            )::int AS open_invoices
          FROM linked_students student
          LEFT JOIN class_sections class_section
            ON class_section.tenant_id = student.tenant_id
           AND class_section.id::text = student.current_class_id::text
          LEFT JOIN student_invoices invoice
            ON invoice.tenant_id = student.tenant_id
           AND invoice.student_id::text = student.id::text
          GROUP BY
            student.id,
            student.admission_number,
            student.first_name,
            student.middle_name,
            student.last_name,
            class_section.name
          ORDER BY student.first_name, student.last_name
        `,
        [identity.tenantId, identity.userId],
      ),
      this.executeSql<{
        id: string;
        student_id: string;
        student_name: string;
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
            student.id AS student_id,
            btrim(concat_ws(' ', student.first_name, student.middle_name, student.last_name)) AS student_name,
            invoice.invoice_number,
            invoice.term,
            invoice.academic_year,
            invoice.amount_minor,
            invoice.balance_minor,
            invoice.status,
            invoice.created_at::text
          FROM student_guardians guardian
          JOIN students student
            ON student.tenant_id = guardian.tenant_id
           AND student.id = guardian.student_id
          JOIN student_invoices invoice
            ON invoice.tenant_id = student.tenant_id
           AND invoice.student_id::text = student.id::text
          WHERE guardian.tenant_id = $1
            AND guardian.user_id = $2::uuid
            AND guardian.status = 'active'
            AND student.deleted_at IS NULL
          ORDER BY invoice.created_at DESC
          LIMIT 100
        `,
        [identity.tenantId, identity.userId],
      ),
      this.executeSql<{
        id: string;
        student_id: string;
        student_name: string;
        receipt_number: string;
        payment_method: string;
        amount_minor: string | number;
        status: string;
        received_at: string;
      }>(
        `
          WITH linked_students AS (
            SELECT student.*
            FROM student_guardians guardian
            JOIN students student
              ON student.tenant_id = guardian.tenant_id
             AND student.id = guardian.student_id
            WHERE guardian.tenant_id = $1
              AND guardian.user_id = $2::uuid
              AND guardian.status = 'active'
              AND student.deleted_at IS NULL
          )
          SELECT
            payment.id::text,
            student.id AS student_id,
            btrim(concat_ws(' ', student.first_name, student.middle_name, student.last_name)) AS student_name,
            payment.receipt_number,
            payment.payment_method,
            payment.amount_minor,
            payment.status,
            payment.received_at::text
          FROM manual_fee_payments payment
          LEFT JOIN student_invoices invoice
            ON invoice.tenant_id = payment.tenant_id
           AND invoice.id = payment.invoice_id
          JOIN linked_students student
            ON student.id::text = COALESCE(payment.student_id::text, invoice.student_id::text)
          WHERE payment.tenant_id = $1
          ORDER BY payment.received_at DESC
          LIMIT 100
        `,
        [identity.tenantId, identity.userId],
      ),
    ]);

    const accounts = accountsResult.rows.map((row) => ({
      ...row,
      balance_minor: Number(row.balance_minor ?? 0),
      open_invoices: Number(row.open_invoices ?? 0),
    }));
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
        balance_minor: accounts.reduce((total, row) => total + row.balance_minor, 0),
        open_invoices: invoices.filter((invoice) => !['paid', 'cancelled', 'waived'].includes(invoice.status)).length,
        payments: transactions.length,
      },
      accounts,
      invoices,
      transactions,
    };
  }

  async getAcademics() {
    const identity = this.requireIdentity();
    const [marksResult, reportCardsResult] = await Promise.all([
      this.executeSql<{
        id: string;
        student_id: string;
        student_name: string;
        subject: string;
        exam: string;
        teacher: string;
        score: string | number;
        remarks: string | null;
        status: string;
        published_at: string | null;
      }>(
        `
          SELECT
            mark.id::text,
            student.id AS student_id,
            btrim(concat_ws(' ', student.first_name, student.middle_name, student.last_name)) AS student_name,
            COALESCE(subject.name, 'Subject not linked') AS subject,
            COALESCE(series.name, 'Assessment') AS exam,
            COALESCE(NULLIF(actor.display_name, ''), NULLIF(actor.full_name, ''), actor.email::text, 'Teacher not recorded') AS teacher,
            mark.score,
            mark.remarks,
            mark.status,
            mark.published_at::text
          FROM student_guardians guardian
          JOIN students student
            ON student.tenant_id = guardian.tenant_id
           AND student.id = guardian.student_id
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
          WHERE guardian.tenant_id = $1
            AND guardian.user_id = $2::uuid
            AND guardian.status = 'active'
            AND mark.status = 'published'
            AND student.deleted_at IS NULL
          ORDER BY mark.published_at DESC NULLS LAST, mark.updated_at DESC
          LIMIT 250
        `,
        [identity.tenantId, identity.userId],
      ),
      this.executeSql<{
        id: string;
        student_id: string;
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
            student.id AS student_id,
            btrim(concat_ws(' ', student.first_name, student.middle_name, student.last_name)) AS student_name,
            COALESCE(series.name, 'Published report card') AS exam_series_name,
            NULLIF(report_card.metadata->>'academic_year', '') AS academic_year,
            COALESCE(NULLIF(report_card.metadata->>'term', ''), series.name) AS term,
            report_card.status,
            report_card.published_at::text
          FROM student_guardians guardian
          JOIN students student
            ON student.tenant_id = guardian.tenant_id
           AND student.id = guardian.student_id
          JOIN student_report_cards report_card
            ON report_card.tenant_id = student.tenant_id
           AND report_card.student_id::text = student.id::text
          LEFT JOIN exam_series series
            ON series.tenant_id = report_card.tenant_id
           AND series.id = report_card.exam_series_id
          WHERE guardian.tenant_id = $1
            AND guardian.user_id = $2::uuid
            AND guardian.status = 'active'
            AND report_card.status = 'published'
            AND student.deleted_at IS NULL
          ORDER BY report_card.published_at DESC NULLS LAST, report_card.updated_at DESC
          LIMIT 100
        `,
        [identity.tenantId, identity.userId],
      ),
    ]);

    const scores = marksResult.rows
      .map((row) => Number(row.score))
      .filter((score) => Number.isFinite(score));

    return {
      metrics: {
        subjects: new Set(marksResult.rows.map((row) => `${row.student_id}:${row.subject}`)).size,
        mean_score: scores.length > 0
          ? Number((scores.reduce((total, score) => total + score, 0) / scores.length).toFixed(2))
          : 0,
        report_cards: reportCardsResult.rows.length,
      },
      assignments: [],
      marks: marksResult.rows.map((row) => ({
        ...row,
        score: Number(row.score),
      })),
      report_cards: reportCardsResult.rows.map((row) => ({
        ...row,
        download_url: `/api/parent/report-cards/${encodeURIComponent(row.id)}/download`,
      })),
    };
  }

  async getBehavior() {
    const identity = this.requireIdentity();
    const [incidentsResult, commendationsResult, pointsResult] = await Promise.all([
      this.executeSql<{
        id: string;
        student_id: string;
        student_name: string;
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
            student.id AS student_id,
            btrim(concat_ws(' ', student.first_name, student.middle_name, student.last_name)) AS student_name,
            incident.title,
            incident.description,
            incident.severity,
            incident.status,
            incident.occurred_at::text,
            incident.created_at::text
          FROM student_guardians guardian
          JOIN students student
            ON student.tenant_id = guardian.tenant_id
           AND student.id = guardian.student_id
          JOIN discipline_incidents incident
            ON incident.tenant_id = student.tenant_id
           AND incident.student_id::text = student.id::text
          WHERE guardian.tenant_id = $1
            AND guardian.user_id = $2::uuid
            AND guardian.status = 'active'
            AND incident.deleted_at IS NULL
            AND student.deleted_at IS NULL
          ORDER BY incident.occurred_at DESC, incident.created_at DESC
          LIMIT 100
        `,
        [identity.tenantId, identity.userId],
      ),
      this.executeSql<{
        id: string;
        student_id: string;
        student_name: string;
        title: string;
        description: string;
        points_delta: number;
        awarded_at: string;
        created_at: string;
      }>(
        `
          SELECT
            commendation.id::text,
            student.id AS student_id,
            btrim(concat_ws(' ', student.first_name, student.middle_name, student.last_name)) AS student_name,
            commendation.title,
            commendation.description,
            commendation.points_delta,
            commendation.awarded_at::text,
            commendation.created_at::text
          FROM student_guardians guardian
          JOIN students student
            ON student.tenant_id = guardian.tenant_id
           AND student.id = guardian.student_id
          JOIN commendations commendation
            ON commendation.tenant_id = student.tenant_id
           AND commendation.student_id::text = student.id::text
          WHERE guardian.tenant_id = $1
            AND guardian.user_id = $2::uuid
            AND guardian.status = 'active'
            AND student.deleted_at IS NULL
          ORDER BY commendation.awarded_at DESC, commendation.created_at DESC
          LIMIT 100
        `,
        [identity.tenantId, identity.userId],
      ),
      this.executeSql<{ behavior_points: number }>(
        `
          SELECT COALESCE(SUM(point.points_delta), 0)::int AS behavior_points
          FROM student_guardians guardian
          JOIN students student
            ON student.tenant_id = guardian.tenant_id
           AND student.id = guardian.student_id
          JOIN behavior_points point
            ON point.tenant_id = student.tenant_id
           AND point.student_id::text = student.id::text
          WHERE guardian.tenant_id = $1
            AND guardian.user_id = $2::uuid
            AND guardian.status = 'active'
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
      child_name: string;
      document_name: string;
      term: string;
      date: string | null;
      type: string;
    }>(
      `
        SELECT
          report_card.id::text,
          btrim(concat_ws(' ', student.first_name, student.middle_name, student.last_name)) AS child_name,
          COALESCE(series.name, 'Published report card') AS document_name,
          COALESCE(NULLIF(report_card.metadata->>'term', ''), series.name, 'Not recorded') AS term,
          report_card.published_at::text AS date,
          'Report card' AS type
        FROM student_guardians guardian
        JOIN students student
          ON student.tenant_id = guardian.tenant_id
         AND student.id = guardian.student_id
        JOIN student_report_cards report_card
          ON report_card.tenant_id = student.tenant_id
         AND report_card.student_id::text = student.id::text
        LEFT JOIN exam_series series
          ON series.tenant_id = report_card.tenant_id
         AND series.id = report_card.exam_series_id
        WHERE guardian.tenant_id = $1
          AND guardian.user_id = $2::uuid
          AND guardian.status = 'active'
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
        download_url: `/api/parent/report-cards/${encodeURIComponent(row.id)}/download`,
      })),
    };
  }

  async getHealth() {
    const identity = this.requireIdentity();
    const result = await this.executeSql<{
      id: string;
      child_name: string;
      date: string;
      complaint: string | null;
      treatment: string | null;
      status: string;
    }>(
      `
        SELECT
          visit.id::text,
          btrim(concat_ws(' ', student.first_name, student.middle_name, student.last_name)) AS child_name,
          visit.visit_date::text AS date,
          visit.symptoms_summary AS complaint,
          visit.treatment_summary AS treatment,
          visit.status
        FROM student_guardians guardian
        JOIN students student
          ON student.tenant_id = guardian.tenant_id
         AND student.id = guardian.student_id
        JOIN clinic_visits visit
          ON visit.tenant_id = student.tenant_id
         AND visit.student_id::text = student.id::text
        WHERE guardian.tenant_id = $1
          AND guardian.user_id = $2::uuid
          AND guardian.status = 'active'
          AND student.deleted_at IS NULL
        ORDER BY visit.visit_date DESC, visit.visit_time DESC
        LIMIT 100
      `,
      [identity.tenantId, identity.userId],
    );

    return {
      metrics: { visits_this_term: result.rows.length },
      items: result.rows,
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
          AND notification.recipient_user_id = $2::uuid
          AND (
            notification.type ILIKE '%message%'
            OR notification.type ILIKE '%communication%'
            OR notification.source_module IN ('communication', 'secretary', 'academics', 'finance', 'discipline')
          )
        ORDER BY notification.created_at DESC
        LIMIT 100
      `,
      [identity.tenantId, identity.userId],
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
          AND notification.recipient_user_id = $2::uuid
        ORDER BY notification.created_at DESC
        LIMIT 100
      `,
      [identity.tenantId, identity.userId],
    );

    return {
      metrics: {
        unread: result.rows.filter((row) => row.status === 'unread').length,
        total: result.rows.length,
      },
      items: result.rows,
    };
  }

  private formatMoney(value: string | number | null): string {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      maximumFractionDigits: 0,
    }).format(Number(value ?? 0) / 100);
  }
}
