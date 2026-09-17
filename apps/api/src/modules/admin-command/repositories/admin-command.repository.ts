import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';
import type { PrincipalExecutiveDashboard } from '../principal-insights.types';

@Injectable()
export class AdminCommandRepository {

  private async executeSql<T = any>(query: string, params: any[] = []): Promise<{ rows: T[], rowCount: number }> {
    const firstParam = params[0];
    const isUuid = typeof firstParam === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(firstParam);

    if ((this.prisma as any).query) {
      return (this.prisma as any).query(query, params);
    }

    
    if (isUuid) {
      return this.prisma.executeWithTenant(firstParam, null, async (tx: any) => {
        const result = await tx.$queryRawUnsafe(query, ...params);
        const arr = Array.isArray(result) ? result : [result];
        return { rows: arr, rowCount: arr.length };
      });
    } else {
      const result = await this.prisma.$queryRawUnsafe(query, ...params);
      const arr = Array.isArray(result) ? result : [result];
        return { rows: arr, rowCount: arr.length };
    }
  }

  constructor(private readonly prisma: PrismaService) {}

  async getPrincipalDashboard(tenantId: string) {
    const result = await this.executeSql(
      `
        SELECT
          0::numeric AS attendance_compliance_rate,
          0::numeric AS fee_collection_rate,
          0::numeric AS academic_performance_index,
          0::numeric AS discipline_severity_index,
          0::numeric AS staff_punctuality_score
        WHERE $1 = $1
      `,
      [tenantId],
    );

    return {
      ...result.rows[0],
      subject_performance_trends: [],
      class_rankings: [],
      discipline_clusters: [],
      fee_arrears_aging: { days_30: 0, days_60: 0, days_90: 0 },
    };
  }

  async getPrincipalOverviewSnapshot(tenantId: string) {
    return this.safeQuery(
      `
        SELECT
          (SELECT COUNT(*)::int FROM students WHERE tenant_id = $1 AND status = 'active') AS total_students,
          (
            SELECT COALESCE(jsonb_object_agg(COALESCE(gender, 'undisclosed'), total), '{}'::jsonb)
            FROM (
              SELECT gender, COUNT(*)::int AS total
              FROM students
              WHERE tenant_id = $1 AND status = 'active'
              GROUP BY gender
            ) gender_counts
          ) AS student_gender_distribution,
          (SELECT COUNT(*)::int FROM class_sections WHERE tenant_id = $1 AND is_active = TRUE) AS active_classes_streams,
          (
            SELECT COUNT(*)::int
            FROM staff_profiles profile
            WHERE profile.tenant_id = $1
              AND profile.status = 'active'
              AND EXISTS (
                SELECT 1
                FROM staff_contracts contract
                WHERE contract.tenant_id = profile.tenant_id
                  AND contract.staff_profile_id = profile.id
                  AND contract.approval_state = 'approved'
                  AND contract.role_title ILIKE '%teacher%'
              )
          ) AS total_teachers,
          (
            SELECT COUNT(*)::int
            FROM staff_profiles profile
            WHERE profile.tenant_id = $1
              AND profile.status = 'active'
              AND NOT EXISTS (
                SELECT 1
                FROM staff_contracts contract
                WHERE contract.tenant_id = profile.tenant_id
                  AND contract.staff_profile_id = profile.id
                  AND contract.approval_state = 'approved'
                  AND contract.role_title ILIKE '%teacher%'
              )
          ) AS total_support_staff,
          0::numeric AS student_attendance_today,
          COALESCE((
            SELECT ROUND(
              100.0 * COUNT(*) FILTER (WHERE status IN ('present', 'late', 'half_day')) / NULLIF(COUNT(*), 0),
              2
            )
            FROM teacher_attendance_logs
            WHERE tenant_id = $1
              AND attendance_date::text = CURRENT_DATE::text
          ), 0)::numeric AS teacher_attendance_today,
          COALESCE((
            SELECT ROUND(
              100.0 * COUNT(*) FILTER (WHERE status = 'active') / NULLIF(COUNT(*), 0),
              2
            )
            FROM student_guardians
            WHERE tenant_id = $1
          ), 0)::numeric AS parent_engagement_rate,
          0::int AS active_users_online
      `,
      [tenantId],
      {
        total_students: 0,
        total_teachers: 0,
        total_support_staff: 0,
        student_gender_distribution: {},
        active_classes_streams: 0,
        student_attendance_today: 0,
        teacher_attendance_today: 0,
        parent_engagement_rate: 0,
        school_population_trends: [],
        active_users_online: 0,
      },
      (row) => ({
        total_students: Number(row?.total_students ?? 0),
        total_teachers: Number(row?.total_teachers ?? 0),
        total_support_staff: Number(row?.total_support_staff ?? 0),
        student_gender_distribution: this.toObject(row?.student_gender_distribution),
        active_classes_streams: Number(row?.active_classes_streams ?? 0),
        student_attendance_today: Number(row?.student_attendance_today ?? 0),
        teacher_attendance_today: Number(row?.teacher_attendance_today ?? 0),
        parent_engagement_rate: Number(row?.parent_engagement_rate ?? 0),
        school_population_trends: [
          { label: 'Current', value: Number(row?.total_students ?? 0) },
        ],
        active_users_online: Number(row?.active_users_online ?? 0),
      }),
    );
  }

  async getPrincipalModuleMetrics(
    tenantId: string,
    moduleCode: string,
  ): Promise<Record<string, number | string>> {
    switch (moduleCode) {
      case 'students':
        return this.safeMetricQuery(
          `
            SELECT
              (SELECT COUNT(*)::int FROM students WHERE tenant_id = $1 AND status = 'active') AS total_students,
              (SELECT COUNT(*)::int FROM class_sections WHERE tenant_id = $1 AND is_active = TRUE) AS active_classes_streams,
              COALESCE((
                SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'active') / NULLIF(COUNT(*), 0), 2)
                FROM student_guardians
                WHERE tenant_id = $1
              ), 0)::numeric AS parent_engagement_rate
          `,
          [tenantId],
        );
      case 'academics':
        return this.safeMetricQuery(
          `
            SELECT
              (SELECT COUNT(*)::int FROM academic_levels WHERE tenant_id = $1 AND is_active = TRUE) AS academic_levels,
              (SELECT COUNT(*)::int FROM subjects WHERE tenant_id = $1 AND status = 'active') AS active_subjects,
              (
                SELECT COUNT(*)::int
                FROM students student
                WHERE student.tenant_id = $1
                  AND student.status = 'active'
                  AND NOT EXISTS (
                    SELECT 1
                    FROM student_class_assignments assignment
                    WHERE assignment.tenant_id = student.tenant_id
                      AND assignment.student_id = student.id
                      AND assignment.status = 'active'
                  )
              ) AS unassigned_students,
              0::numeric AS competency_progress_rate
          `,
          [tenantId],
        );
      case 'exams':
        return this.safeMetricQuery(
          `
            SELECT
              COALESCE(ROUND(AVG(score), 2), 0)::numeric AS mean_score,
              COALESCE(ROUND(100.0 * COUNT(*) FILTER (WHERE status IN ('submitted', 'reviewed', 'locked', 'published')) / NULLIF(COUNT(*), 0), 2), 0)::numeric AS exam_completion_rate,
              COUNT(*) FILTER (WHERE status = 'draft')::int AS draft_marks
            FROM exam_marks
            WHERE tenant_id = $1
          `,
          [tenantId],
        );
      case 'finance':
        return this.safeMetricQuery(
          `
            SELECT
              COALESCE(ROUND(100.0 * SUM(amount_paid_minor) / NULLIF(SUM(total_amount_minor), 0), 2), 0)::numeric AS fee_collection_rate,
              COALESCE(SUM(total_amount_minor - amount_paid_minor), 0)::numeric AS outstanding_balance_minor,
              COALESCE(SUM(amount_paid_minor) FILTER (WHERE paid_at::date = CURRENT_DATE), 0)::numeric AS daily_collections_minor,
              COUNT(*) FILTER (WHERE status IN ('draft', 'open', 'pending_payment'))::int AS pending_finance_approvals
            FROM invoices
            WHERE tenant_id = $1
          `,
          [tenantId],
        );
      case 'staff':
        return this.safeMetricQuery(
          `
            SELECT
              (SELECT COUNT(*)::int FROM staff_profiles WHERE tenant_id = $1 AND status = 'active') AS active_staff,
              (SELECT COUNT(*)::int FROM staff_leave_requests WHERE tenant_id = $1 AND status = 'requested') AS pending_leave_requests,
              (
                SELECT COUNT(*)::int
                FROM staff_contracts
                WHERE tenant_id = $1
                  AND approval_state = 'approved'
                  AND ends_on BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '60 days'
              ) AS contracts_expiring_soon,
              0::int AS workload_alerts
          `,
          [tenantId],
        );
      case 'teacher_biometric_attendance':
        return this.safeMetricQuery(
          `
            SELECT
              (SELECT COUNT(DISTINCT teacher_user_id)::int FROM teacher_attendance_logs WHERE tenant_id = $1 AND attendance_date::text = CURRENT_DATE::text AND status IN ('present', 'late', 'half_day')) AS teacher_present_today,
              (SELECT COUNT(*)::int FROM teacher_attendance_logs WHERE tenant_id = $1 AND attendance_date::text = CURRENT_DATE::text AND status = 'late') AS teacher_late_today,
              (SELECT COUNT(*)::int FROM teacher_attendance_logs WHERE tenant_id = $1 AND attendance_date::text = CURRENT_DATE::text AND status = 'absent') AS teacher_absent_today,
              (SELECT COUNT(*)::int FROM biometric_devices WHERE tenant_id = $1 AND status <> 'active') AS offline_biometric_devices
          `,
          [tenantId],
        );
      case 'clinic_health':
        return this.safeMetricQuery(
          `
            SELECT
              (SELECT COUNT(*)::int FROM clinic_visits WHERE tenant_id = $1 AND visit_date::date = CURRENT_DATE) AS clinic_visits_today,
              (SELECT COUNT(*)::int FROM clinic_medicine_batches WHERE tenant_id = $1 AND quantity_available <= minimum_stock_threshold AND status = 'active') AS medicine_low_stock,
              (SELECT COUNT(*)::int FROM clinic_medicine_batches WHERE tenant_id = $1 AND expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days' AND status = 'active') AS medicine_expiring_soon,
              (SELECT COUNT(*)::int FROM clinic_medicine_batches WHERE tenant_id = $1 AND quantity_available <= 0 AND status = 'active') AS out_of_stock_medicines,
              (SELECT COUNT(*)::int FROM clinic_medicine_batches WHERE tenant_id = $1 AND quantity_available <= 0 AND is_emergency_supply = TRUE) AS critical_medicine_shortages,
              COALESCE((
                SELECT SUM(dispense.quantity_dispensed * medicine.cost_price_minor)
                FROM clinic_medicine_dispenses dispense
                INNER JOIN clinic_medicines medicine
                  ON medicine.tenant_id = dispense.tenant_id
                 AND medicine.id = dispense.medicine_id
                WHERE dispense.tenant_id = $1
                  AND dispense.dispensed_at >= date_trunc('month', NOW())
              ), 0)::numeric AS medicine_consumption_cost_minor,
              COALESCE((
                SELECT SUM(batch.quantity_available * medicine.cost_price_minor)
                FROM clinic_medicine_batches batch
                INNER JOIN clinic_medicines medicine
                  ON medicine.tenant_id = batch.tenant_id
                 AND medicine.id = batch.medicine_id
                WHERE batch.tenant_id = $1
                  AND batch.status = 'expired'
              ), 0)::numeric AS wastage_due_to_expiry_minor,
              COALESCE((
                SELECT ROUND(
                  100.0 * COUNT(*) FILTER (WHERE batch.quantity_available > 0 AND batch.status IN ('active', 'near_expiry'))
                  / NULLIF(COUNT(*), 0),
                  2
                )
                FROM clinic_medicine_batches batch
                WHERE batch.tenant_id = $1
                  AND batch.is_emergency_supply = TRUE
              ), 100)::numeric AS emergency_supply_ready_rate,
              COALESCE((
                SELECT medicine.medicine_name
                FROM clinic_medicine_dispenses dispense
                INNER JOIN clinic_medicines medicine
                  ON medicine.tenant_id = dispense.tenant_id
                 AND medicine.id = dispense.medicine_id
                WHERE dispense.tenant_id = $1
                  AND dispense.dispensed_at >= date_trunc('month', NOW())
                GROUP BY medicine.medicine_name
                ORDER BY SUM(dispense.quantity_dispensed) DESC, medicine.medicine_name ASC
                LIMIT 1
              ), 'None') AS most_used_medicine
          `,
          [tenantId],
        );
      case 'inventory':
        return this.safeMetricQuery(
          `
            SELECT
              COUNT(*) FILTER (WHERE quantity_on_hand <= reorder_level AND quantity_on_hand > 0)::int AS inventory_low_stock,
              COUNT(*) FILTER (WHERE quantity_on_hand <= 0)::int AS inventory_out_of_stock,
              0::int AS damaged_assets,
              COALESCE(SUM(quantity_on_hand * unit_price), 0)::numeric AS inventory_value_minor
            FROM inventory_items
            WHERE tenant_id = $1
              AND is_archived = FALSE
          `,
          [tenantId],
        );
      case 'procurement':
        return this.safeMetricQuery(
          `
            SELECT
              (SELECT COUNT(*)::int FROM inventory_requests WHERE tenant_id = $1 AND status = 'pending') AS pending_procurement_requests,
              (SELECT COUNT(*)::int FROM inventory_purchase_orders WHERE tenant_id = $1 AND status IN ('draft', 'approved')) AS open_purchase_orders,
              (SELECT COUNT(*)::int FROM inventory_purchase_orders WHERE tenant_id = $1 AND expected_delivery_date < CURRENT_DATE AND received_at IS NULL) AS overdue_purchase_orders
          `,
          [tenantId],
        );
      case 'lab_management':
        return this.safeMetricQuery(
          `
            SELECT
              COALESCE((
                SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'present') / NULLIF(COUNT(*), 0), 2)
                FROM lab_attendance
                WHERE tenant_id = $1
              ), 0)::numeric AS lab_attendance_compliance_rate,
              (SELECT COUNT(*)::int FROM lab_sessions WHERE tenant_id = $1 AND status = 'scheduled' AND session_date < CURRENT_DATE) AS missed_practical_sessions,
              (SELECT COUNT(*)::int FROM chemical_items WHERE tenant_id = $1 AND expiry_date <= CURRENT_DATE + INTERVAL '90 days' AND status IN ('active', 'near_expiry')) AS chemical_expiry_alerts,
              (SELECT COUNT(*)::int FROM lab_equipment WHERE tenant_id = $1 AND condition_status <> 'serviceable') AS lab_equipment_maintenance_alerts
          `,
          [tenantId],
        );
      case 'discipline':
        return this.safeMetricQuery(
          `
            SELECT
              COUNT(*) FILTER (WHERE status IN ('reported', 'reviewed', 'escalated'))::int AS open_discipline_cases,
              COUNT(*) FILTER (WHERE severity = 'critical')::int AS critical_discipline_cases,
              0::int AS repeat_offender_alerts,
              0::int AS welfare_concerns
            FROM admin_incidents
            WHERE tenant_id = $1
          `,
          [tenantId],
        );
      case 'communication_sms':
        return this.safeMetricQuery(
          `
            SELECT
              COALESCE((
                SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE status IN ('sent', 'delivered')) / NULLIF(COUNT(*), 0), 2)
                FROM sms_logs
                WHERE tenant_id = $1
              ), 0)::numeric AS sms_delivery_rate,
              (SELECT COUNT(*)::int FROM sms_logs WHERE tenant_id = $1 AND status = 'failed') AS failed_sms,
              COALESCE((SELECT sms_balance FROM school_sms_wallets WHERE tenant_id = $1 LIMIT 1), 0)::int AS sms_balance,
              0::numeric AS circular_readership_rate
          `,
          [tenantId],
        );
      case 'ai_insights':
        return this.safeMetricQuery(
          `
            WITH rule_metrics AS (
              SELECT
                (
                  SELECT COUNT(*)::int
                  FROM invoices
                  WHERE tenant_id = $1
                    AND status IN ('open', 'overdue', 'pending_payment')
                    AND amount_paid_minor < total_amount_minor
                ) AS fee_default_risk_alerts,
                (
                  SELECT COUNT(*)::int
                  FROM clinic_medicine_batches
                  WHERE tenant_id = $1
                    AND status = 'active'
                    AND (
                      quantity_available <= minimum_stock_threshold
                      OR expiry_date <= CURRENT_DATE + INTERVAL '30 days'
                    )
                ) AS medicine_shortage_predictions,
                (
                  SELECT COUNT(*)::int
                  FROM teacher_attendance_logs
                  WHERE tenant_id = $1
                    AND attendance_date::text >= (CURRENT_DATE - INTERVAL '7 days')::date::text
                    AND status IN ('late', 'absent', 'half_day')
                ) AS attendance_irregularities,
                (
                  SELECT COUNT(*)::int
                  FROM inventory_purchase_orders
                  WHERE tenant_id = $1
                    AND status IN ('draft', 'approved')
                    AND total_amount > 0
                    AND (
                      expected_delivery_date IS NULL
                      OR expected_delivery_date <= CURRENT_DATE + INTERVAL '14 days'
                    )
                ) AS budget_overrun_alerts,
                (
                  SELECT COUNT(*)::int
                  FROM exam_marks
                  WHERE tenant_id = $1
                    AND status IN ('submitted', 'reviewed', 'locked', 'published')
                    AND score < 40
                ) AS performance_decline_warnings,
                (
                  SELECT COUNT(*)::int
                  FROM biometric_devices
                  WHERE tenant_id = $1
                    AND status <> 'active'
                ) AS device_anomalies,
                (
                  SELECT COUNT(*)::int
                  FROM sms_logs
                  WHERE tenant_id = $1
                    AND status = 'failed'
                ) AS communication_anomalies
            )
            SELECT
              (
                fee_default_risk_alerts
                + medicine_shortage_predictions
                + attendance_irregularities
                + budget_overrun_alerts
                + performance_decline_warnings
              )::int AS smart_risk_alerts,
              (device_anomalies + communication_anomalies)::int AS operational_anomalies,
              (
                medicine_shortage_predictions
                + fee_default_risk_alerts
                + performance_decline_warnings
              )::int AS predictions_generated,
              fee_default_risk_alerts,
              medicine_shortage_predictions,
              attendance_irregularities,
              budget_overrun_alerts,
              performance_decline_warnings
            FROM rule_metrics
          `,
          [tenantId],
        );
      default:
        return {
          transport_route_delays: 0,
          bus_attendance_rate: 0,
          vehicle_alerts: 0,
          hostel_occupancy_rate: 0,
          boarding_incidents: 0,
          dormitory_issues: 0,
          meal_consumption_rate: 0,
          boarding_welfare_alerts: 0,
          lesson_coverage_rate: 0,
          timetable_conflicts: 0,
          missing_lessons: 0,
          borrowed_books: 0,
          overdue_books: 0,
          library_visits_today: 0,
          smart_risk_alerts: 0,
          operational_anomalies: 0,
          predictions_generated: 0,
        };
    }
  }

  async getDeputyDashboard(tenantId: string) {
    const result = await this.executeSql(
      `
        SELECT
          COUNT(*) FILTER (WHERE status = 'reported')::int AS reported_incidents,
          COUNT(*) FILTER (WHERE status = 'escalated')::int AS escalated_incidents
        FROM admin_incidents
        WHERE tenant_id = $1
      `,
      [tenantId],
    );

    return {
      live_teacher_attendance_feed: [],
      missing_teacher_alerts: [],
      student_attendance_compliance: [],
      timetable_execution: [],
      incident_summary: result.rows[0] ?? { reported_incidents: 0, escalated_incidents: 0 },
    };
  }

  async getSecretaryDashboard(tenantId: string) {
    const result = await this.executeSql(
      `
        SELECT
          (SELECT COUNT(*)::int FROM announcements WHERE tenant_id = $1) AS announcements,
          (SELECT COUNT(*)::int FROM meeting_minutes WHERE tenant_id = $1) AS meetings
      `,
      [tenantId],
    );

    return {
      communication_summary: result.rows[0] ?? { announcements: 0, meetings: 0 },
      records_summary: [],
      report_exports: [],
    };
  }

  async getFinanceOverview(tenantId: string) {
    const summaryResult = await this.executeSql(
      `
        SELECT
          COALESCE((
            SELECT SUM(payment.amount_minor)
            FROM manual_fee_payments payment
            WHERE payment.tenant_id = $1
              AND lower(payment.status) NOT IN ('bounced', 'reversed')
              AND timezone('Africa/Nairobi', payment.received_at)::date = timezone('Africa/Nairobi', NOW())::date
          ), 0)::bigint AS collections_today_minor,
          COALESCE((
            SELECT SUM(GREATEST(invoice.total_amount_minor - invoice.amount_paid_minor, 0))
            FROM invoices invoice
            WHERE invoice.tenant_id = $1
              AND NULLIF(invoice.metadata ->> 'student_id', '') IS NOT NULL
              AND lower(invoice.status) NOT IN ('paid', 'void')
          ), 0)::bigint AS outstanding_balance_minor
      `,
      [tenantId],
    );

    const waiversResult = await this.executeSql(
      `
        SELECT
          approval.id::text,
          COALESCE(
            NULLIF(approval.metadata ->> 'studentName', ''),
            NULLIF(approval.metadata ->> 'student_name', ''),
            NULLIF(student.first_name || ' ' || student.last_name, ' '),
            approval.record_id,
            'Unknown student'
          ) AS student,
          COALESCE(
            NULLIF(approval.metadata ->> 'className', ''),
            NULLIF(approval.metadata ->> 'class_name', ''),
            'Unassigned'
          ) AS class,
          CASE
            WHEN COALESCE(approval.metadata ->> 'amountMinor', approval.metadata ->> 'amount_minor', '') ~ '^[0-9]+$'
              THEN COALESCE(approval.metadata ->> 'amountMinor', approval.metadata ->> 'amount_minor')::bigint
            ELSE 0::bigint
          END AS amount_minor,
          COALESCE(NULLIF(approval.reason, ''), 'Fee waiver approval request') AS reason,
          approval.created_at AS date
        FROM dashboard_approval_requests approval
        LEFT JOIN students student
          ON student.tenant_id = approval.tenant_id
         AND student.id::text = approval.record_id
        WHERE approval.tenant_id = $1
          AND upper(approval.status) = 'PENDING'
          AND lower(COALESCE(approval.module, '')) = 'finance'
          AND lower(COALESCE(approval.approval_type, '')) IN ('fee_waiver', 'waiver')
        ORDER BY approval.created_at DESC
        LIMIT 5
      `,
      [tenantId],
    );

    const collectionsMinor = Number(summaryResult.rows[0]?.collections_today_minor ?? 0);
    const arrearsMinor = Number(summaryResult.rows[0]?.outstanding_balance_minor ?? 0);

    const trendResult = await this.executeSql(
      `
        SELECT
          to_char(date_trunc('week', payment.received_at), 'DD Mon') AS label,
          SUM(payment.amount_minor)::bigint AS total_minor
        FROM manual_fee_payments payment
        WHERE payment.tenant_id = $1
          AND lower(payment.status) NOT IN ('bounced', 'reversed')
          AND payment.received_at >= date_trunc('week', NOW()) - INTERVAL '4 weeks'
        GROUP BY date_trunc('week', payment.received_at)
        ORDER BY date_trunc('week', payment.received_at) ASC
        LIMIT 5
      `,
      [tenantId],
    );

    const maximumCollectionMinor = trendResult.rows.reduce(
      (maximum: number, row: any) => Math.max(maximum, Number(row.total_minor ?? 0)),
      0,
    );
    const collectionData = trendResult.rows.map((row: any) => {
      const amountMinor = Number(row.total_minor ?? 0);
      return {
        label: row.label,
        value: maximumCollectionMinor > 0
          ? Math.round((amountMinor / maximumCollectionMinor) * 100)
          : 0,
        amount: `KES ${(amountMinor / 100).toLocaleString()}`,
      };
    });

    return {
      status: "active",
      collectionsToday: `KES ${(collectionsMinor / 100).toLocaleString()}`,
      outstandingInvoices: `KES ${(arrearsMinor / 100).toLocaleString()}`,
      collectionData,
      pendingWaivers: waiversResult.rows.map(row => ({
        ...row,
        amount: `KES ${(Number(row.amount_minor ?? 0) / 100).toLocaleString()}`,
        date: new Date(row.date).toLocaleDateString(),
      }))
    };
  }

  async getStudentsOverview(tenantId: string) {
    const summaryResult = await this.executeSql(
      `
        SELECT
          COUNT(*) FILTER (WHERE lower(status) = 'active')::int AS total_students,
          COUNT(*) FILTER (WHERE lower(status) = 'active' AND lower(gender) = 'male')::int AS boys,
          COUNT(*) FILTER (WHERE lower(status) = 'active' AND lower(gender) = 'female')::int AS girls
        FROM students
        WHERE tenant_id = $1
      `,
      [tenantId],
    );

    const recentAdmissionsResult = await this.executeSql(
      `
        SELECT
          s.admission_number AS id,
          CONCAT_WS(' ', s.first_name, NULLIF(s.middle_name, ''), s.last_name) AS name,
          COALESCE(initcap(s.gender), 'Not Specified') AS gender,
          COALESCE((
            SELECT section.name
            FROM student_class_assignments assignment
            JOIN class_sections section
              ON section.tenant_id = assignment.tenant_id
             AND section.id::text = assignment.class_section_id::text
            WHERE assignment.tenant_id = s.tenant_id
              AND assignment.student_id::text = s.id::text
              AND assignment.status = 'active'
            ORDER BY assignment.updated_at DESC
            LIMIT 1
          ), 'Unassigned') AS class,
          to_char(s.created_at, 'YYYY-MM-DD') AS admission_date
        FROM students s
        WHERE s.tenant_id = $1
          AND lower(s.status) = 'active'
        ORDER BY s.created_at DESC
        LIMIT 5
      `,
      [tenantId],
    );

    const totalStudents = summaryResult.rows[0]?.total_students || 0;
    const boys = summaryResult.rows[0]?.boys || 0;
    const girls = summaryResult.rows[0]?.girls || 0;

    const trendResult = await this.executeSql(
      `SELECT
         to_char(date_trunc('month', created_at), 'Mon YYYY') as label,
         COUNT(*)::int as value
       FROM students
       WHERE tenant_id = $1
         AND lower(status) = 'active'
         AND created_at >= date_trunc('month', CURRENT_DATE) - INTERVAL '2 months'
       GROUP BY date_trunc('month', created_at)
       ORDER BY date_trunc('month', created_at) ASC
       LIMIT 3`,
      [tenantId]
    );

    const populationTrend = trendResult.rows.map((row: any) => ({
      label: row.label,
      value: Number(row.value ?? 0),
    }));

    return {
      status: "active",
      totalStudents,
      boys,
      girls,
      populationTrend,
      recentAdmissions: recentAdmissionsResult.rows
    };
  }

  async getDisciplineOverview(tenantId: string) {
    const summaryResult = await this.executeSql(
      `
        SELECT
          COUNT(*) FILTER (WHERE lower(status) IN ('reported', 'reviewed', 'escalated'))::int AS open_cases,
          COUNT(*) FILTER (
            WHERE lower(severity) = 'critical'
              AND lower(status) IN ('reported', 'reviewed', 'escalated')
          )::int AS critical_cases,
          COUNT(*) FILTER (WHERE lower(status) = 'escalated')::int AS escalations
        FROM admin_incidents
        WHERE tenant_id = $1
      `,
      [tenantId],
    );

    const recentIncidentsResult = await this.executeSql(
      `
        SELECT
          id,
          title,
          severity,
          status,
          to_char(created_at, 'YYYY-MM-DD HH24:MI') AS date
        FROM admin_incidents
        WHERE tenant_id = $1
        ORDER BY created_at DESC
        LIMIT 5
      `,
      [tenantId],
    );

    const studentsResult = await this.executeSql(
      `
        SELECT
          s.id,
          CONCAT_WS(' ', s.first_name, NULLIF(s.middle_name, ''), s.last_name) AS name,
          s.admission_number,
          COALESCE((
            SELECT section.name
            FROM student_class_assignments assignment
            JOIN class_sections section
              ON section.tenant_id = assignment.tenant_id
             AND section.id::text = assignment.class_section_id::text
            WHERE assignment.tenant_id = s.tenant_id
              AND assignment.student_id::text = s.id::text
              AND assignment.status = 'active'
            ORDER BY assignment.updated_at DESC
            LIMIT 1
          ), 'Unassigned') AS class
        FROM students s
        WHERE s.tenant_id = $1
          AND lower(s.status) = 'active'
        ORDER BY s.first_name ASC, s.last_name ASC
        LIMIT 250
      `,
      [tenantId],
    );

    const openCases = summaryResult.rows[0]?.open_cases || 0;
    const criticalCases = summaryResult.rows[0]?.critical_cases || 0;
    const escalations = summaryResult.rows[0]?.escalations || 0;

    const trendResult = await this.executeSql(
      `SELECT
         'Week ' || extract(week from created_at) as label,
         COUNT(*)::int as value
       FROM admin_incidents
       WHERE tenant_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '28 days'
       GROUP BY extract(week from created_at)
       ORDER BY extract(week from created_at) ASC
      LIMIT 4`,
      [tenantId]
    );

    const incidentTrend = trendResult.rows.map((row: any) => ({
      label: row.label,
      value: Number(row.value ?? 0),
    }));

    return {
      status: "active",
      openCases,
      criticalCases,
      escalations,
      incidentTrend,
      recentIncidents: recentIncidentsResult.rows,
      students: studentsResult.rows
    };
  }

  async getAttendanceOverview(tenantId: string) {
    const summaryResult = await this.executeSql(
      `
        WITH canonical_attendance AS (
          SELECT
            record.student_id::text AS student_id,
            record.attendance_date,
            lower(record.status::text) AS status
          FROM attendance_records record
          WHERE record.tenant_id::text = $1::text

          UNION ALL

          SELECT
            live.student_id::text AS student_id,
            live.attendance_date::date,
            lower(live.status::text) AS status
          FROM academics_attendance live
          WHERE live.tenant_id::text = $1::text
            AND NOT EXISTS (
              SELECT 1
              FROM attendance_records record
              WHERE record.tenant_id::text = live.tenant_id::text
                AND record.student_id::text = live.student_id::text
                AND record.attendance_date = live.attendance_date::date
            )
        ), chronic_students AS (
          SELECT attendance.student_id
          FROM canonical_attendance attendance
          WHERE attendance.attendance_date >= CURRENT_DATE - INTERVAL '29 days'
            AND attendance.status IN ('absent', 'excused')
          GROUP BY attendance.student_id
          HAVING COUNT(*) >= 3
        )
        SELECT
          (SELECT COUNT(*)::int FROM canonical_attendance WHERE attendance_date = CURRENT_DATE AND status = 'present') AS present_today,
          (SELECT COUNT(*)::int FROM canonical_attendance WHERE attendance_date = CURRENT_DATE AND status IN ('absent', 'excused')) AS absent_today,
          (SELECT COUNT(*)::int FROM canonical_attendance WHERE attendance_date = CURRENT_DATE AND status = 'late') AS late_today,
          COALESCE(ROUND(
            100.0 * (SELECT COUNT(*) FROM chronic_students)
            / NULLIF((SELECT COUNT(*) FROM students WHERE tenant_id::text = $1::text AND lower(status) = 'active'), 0),
            0
          ), 0)::int AS chronic_absenteeism
      `,
      [tenantId],
    );

    const present = Number(summaryResult.rows[0]?.present_today ?? 0);
    const absent = Number(summaryResult.rows[0]?.absent_today ?? 0);
    const late = Number(summaryResult.rows[0]?.late_today ?? 0);
    const chronicAbsenteeism = Number(summaryResult.rows[0]?.chronic_absenteeism ?? 0);

    const recentAbsencesResult = await this.executeSql(
      `
        WITH canonical_attendance AS (
          SELECT
            record.id::text AS id,
            record.student_id::text AS student_id,
            record.attendance_date,
            lower(record.status::text) AS status,
            record.notes,
            record.created_at
          FROM attendance_records record
          WHERE record.tenant_id = $1

          UNION ALL

          SELECT
            live.id::text AS id,
            live.student_id::text AS student_id,
            live.attendance_date::date,
            lower(live.status::text) AS status,
            NULL::text AS notes,
            live.created_at
          FROM academics_attendance live
          WHERE live.tenant_id::text = $1::text
            AND NOT EXISTS (
              SELECT 1
              FROM attendance_records record
              WHERE record.tenant_id::text = live.tenant_id::text
                AND record.student_id::text = live.student_id::text
                AND record.attendance_date = live.attendance_date::date
            )
        )
        SELECT
          attendance.id,
          attendance.student_id,
          CONCAT_WS(' ', s.first_name, s.last_name) AS student_name,
          s.admission_number,
          to_char(attendance.attendance_date, 'YYYY-MM-DD') AS date,
          attendance.status,
          attendance.notes AS reason
        FROM canonical_attendance attendance
        JOIN students s
          ON s.tenant_id = $1
         AND s.id::text = attendance.student_id
        WHERE attendance.status IN ('absent', 'excused')
        ORDER BY attendance.attendance_date DESC, attendance.created_at DESC
        LIMIT 10
      `,
      [tenantId],
    );

    const studentsResult = await this.executeSql(
      `
        SELECT
          s.id,
          CONCAT_WS(' ', s.first_name, NULLIF(s.middle_name, ''), s.last_name) AS name,
          s.admission_number,
          COALESCE((
            SELECT section.name
            FROM student_class_assignments assignment
            JOIN class_sections section
              ON section.tenant_id = assignment.tenant_id
             AND section.id::text = assignment.class_section_id::text
            WHERE assignment.tenant_id = s.tenant_id
              AND assignment.student_id::text = s.id::text
              AND assignment.status = 'active'
            ORDER BY assignment.updated_at DESC
            LIMIT 1
          ), 'Unassigned') AS class
        FROM students s
        WHERE s.tenant_id = $1
          AND lower(s.status) = 'active'
        ORDER BY s.first_name ASC, s.last_name ASC
        LIMIT 250
      `,
      [tenantId],
    );

    const trendResult = await this.executeSql(
      `
       WITH canonical_attendance AS (
         SELECT record.student_id::text AS student_id, record.attendance_date, lower(record.status::text) AS status
         FROM attendance_records record
         WHERE record.tenant_id = $1

         UNION ALL

         SELECT live.student_id::text AS student_id, live.attendance_date::date, lower(live.status::text) AS status
         FROM academics_attendance live
         WHERE live.tenant_id::text = $1::text
           AND NOT EXISTS (
             SELECT 1
             FROM attendance_records record
             WHERE record.tenant_id::text = live.tenant_id::text
               AND record.student_id::text = live.student_id::text
               AND record.attendance_date = live.attendance_date::date
           )
       )
       SELECT
         to_char(attendance_date, 'Dy') AS label,
         ROUND(
           100.0 * COUNT(*) FILTER (WHERE status IN ('present', 'late'))
           / NULLIF(COUNT(*), 0),
           0
         )::int AS value
       FROM canonical_attendance
       WHERE attendance_date >= CURRENT_DATE - INTERVAL '6 days'
       GROUP BY attendance_date
       ORDER BY attendance_date ASC
       LIMIT 7`,
      [tenantId]
    );

    const attendanceTrend = trendResult.rows.map((row: any) => ({
      label: row.label,
      value: Number(row.value ?? 0),
    }));

    return {
      status: "active",
      present,
      absent,
      late,
      chronicAbsenteeism,
      attendanceTrend,
      recentAbsences: recentAbsencesResult.rows,
      students: studentsResult.rows
    };
  }

  async getAcademicsOverview(tenantId: string) {
    const summaryResult = await this.executeSql(
      `
        SELECT
          COUNT(*) FILTER (
            WHERE lower(status) IN ('draft', 'published')
              AND due_date >= CURRENT_DATE
          )::int AS active_assignments
        FROM academics_assignments
        WHERE tenant_id = $1
      `,
      [tenantId],
    );

    const activeAssignments = Number(summaryResult.rows[0]?.active_assignments ?? 0);

    const avgScoreRes = await this.executeSql(
      `
        SELECT COALESCE(
          ROUND(AVG((mark.score / NULLIF(assessment.max_score, 0)) * 100), 2),
          0
        )::numeric AS average_score
        FROM exam_marks mark
        JOIN exam_assessments assessment
          ON assessment.tenant_id = mark.tenant_id
         AND assessment.id = mark.assessment_id
        WHERE mark.tenant_id = $1
          AND mark.score_status = 'entered'
          AND mark.status IN ('submitted', 'reviewed', 'locked', 'published')
      `,
      [tenantId]
    );
    const averageScore = Number(avgScoreRes.rows[0]?.average_score ?? 0);

    const coverageResult = await this.executeSql(
      `
        SELECT COALESCE(
          ROUND(
            100.0 * COUNT(DISTINCT log.plan_id) FILTER (WHERE log.id IS NOT NULL)
            / NULLIF(COUNT(DISTINCT plan.id), 0),
            0
          ),
          0
        )::int AS syllabus_coverage
        FROM academics_lesson_plans plan
        LEFT JOIN academics_lesson_logs log
          ON log.tenant_id::text = plan.tenant_id::text
         AND log.plan_id = plan.id
        WHERE plan.tenant_id = $1
      `,
      [tenantId],
    );

    const performanceTrendResult = await this.executeSql(
      `
        SELECT
          series.name AS label,
          COALESCE(
            ROUND(AVG((mark.score / NULLIF(assessment.max_score, 0)) * 100), 2),
            0
          )::numeric AS value
        FROM exam_series series
        JOIN exam_marks mark
          ON mark.tenant_id = series.tenant_id
         AND mark.exam_series_id = series.id
        JOIN exam_assessments assessment
          ON assessment.tenant_id = mark.tenant_id
         AND assessment.id = mark.assessment_id
        WHERE series.tenant_id = $1
          AND mark.score_status = 'entered'
          AND mark.status IN ('submitted', 'reviewed', 'locked', 'published')
        GROUP BY series.id, series.name, series.created_at
        ORDER BY series.created_at DESC
        LIMIT 5
      `,
      [tenantId],
    );

    const departmentPerformanceResult = await this.executeSql(
      `
        SELECT
          COALESCE(department.name, 'Unassigned') AS department,
          COALESCE(
            ROUND(AVG((mark.score / NULLIF(assessment.max_score, 0)) * 100), 2),
            0
          )::numeric AS score
        FROM exam_marks mark
        JOIN exam_assessments assessment
          ON assessment.tenant_id = mark.tenant_id
         AND assessment.id = mark.assessment_id
        LEFT JOIN subjects subject
          ON subject.tenant_id = mark.tenant_id
         AND subject.id::text = mark.subject_id::text
        LEFT JOIN academics_departments department
          ON department.tenant_id = subject.tenant_id
         AND department.id::text = subject.department_id::text
        WHERE mark.tenant_id = $1
          AND mark.score_status = 'entered'
          AND mark.status IN ('submitted', 'reviewed', 'locked', 'published')
        GROUP BY department.name
        ORDER BY score DESC, department
      `,
      [tenantId],
    );

    return {
      status: "active",
      activeAssignments,
      syllabusCoverage: Number(coverageResult.rows[0]?.syllabus_coverage ?? 0),
      averageScore,
      performanceTrend: performanceTrendResult.rows.reverse().map((row: any) => ({
        label: row.label,
        value: Number(row.value ?? 0),
      })),
      departmentPerformance: departmentPerformanceResult.rows.map((row: any) => ({
        department: row.department,
        score: Number(row.score ?? 0),
      })),
    };
  }

  async getExamsOverview(tenantId: string) {
    const activeExamsRes = await this.executeSql(
      `
        SELECT COUNT(*)::int AS count
        FROM exam_series
        WHERE tenant_id = $1
          AND lower(status) IN ('draft', 'submitted', 'reviewed', 'locked')
          AND ends_on >= CURRENT_DATE
      `,
      [tenantId]
    );

    const missingMarksRes = await this.executeSql(
      `
        SELECT COUNT(*)::int AS count
        FROM (
          SELECT entry_window.id
          FROM exam_mark_entry_windows entry_window
          LEFT JOIN exam_marks mark
            ON mark.tenant_id = entry_window.tenant_id
           AND mark.exam_series_id = entry_window.exam_series_id
           AND mark.subject_id = entry_window.subject_id
           AND mark.class_section_id = entry_window.class_section_id
          WHERE entry_window.tenant_id = $1
            AND lower(entry_window.status) IN ('open', 'submitted', 'returned')
          GROUP BY entry_window.id
          HAVING COUNT(mark.id) = 0
             OR COUNT(mark.id) FILTER (WHERE mark.status = 'draft') > 0
        ) missing_windows
      `,
      [tenantId]
    );

    const avgScoreRes = await this.executeSql(
      `
        SELECT COALESCE(
          ROUND(AVG((mark.score / NULLIF(assessment.max_score, 0)) * 100), 2),
          0
        )::numeric AS average_score
        FROM exam_marks mark
        JOIN exam_assessments assessment
          ON assessment.tenant_id = mark.tenant_id
         AND assessment.id = mark.assessment_id
        WHERE mark.tenant_id = $1
          AND mark.score_status = 'entered'
          AND mark.status IN ('submitted', 'reviewed', 'locked', 'published')
      `,
      [tenantId]
    );

    const averageScore = Number(avgScoreRes.rows[0]?.average_score ?? 0);

    const performanceTrendResult = await this.executeSql(
      `SELECT
         e.name as label,
         COALESCE(
           ROUND(AVG((m.score / NULLIF(assessment.max_score, 0)) * 100), 2),
           0
         )::numeric as value
       FROM exam_series e
       JOIN exam_marks m ON m.exam_series_id = e.id AND m.tenant_id = e.tenant_id
       JOIN exam_assessments assessment
         ON assessment.tenant_id = m.tenant_id
        AND assessment.id = m.assessment_id
       WHERE e.tenant_id = $1
         AND m.score_status = 'entered'
         AND m.status IN ('submitted', 'reviewed', 'locked', 'published')
       GROUP BY e.id, e.name, e.created_at
       ORDER BY e.created_at DESC
       LIMIT 5`,
      [tenantId]
    );

    const recentSeriesResult = await this.executeSql(
      `
        SELECT
          series.id::text,
          series.id::text AS exam_id,
          series.name AS title,
          lower(series.status) AS status,
          to_char(series.starts_on, 'YYYY-MM-DD') AS starts_on,
          to_char(series.ends_on, 'YYYY-MM-DD') AS ends_on,
          COUNT(card.id)::int AS total_report_cards,
          COUNT(card.id) FILTER (WHERE card.status = 'approved')::int AS approved_report_cards,
          COUNT(card.id) FILTER (WHERE card.status = 'published')::int AS published_report_cards,
          COUNT(card.id) FILTER (WHERE card.status NOT IN ('approved', 'published'))::int AS blocked_report_cards
        FROM exam_series series
        LEFT JOIN student_report_cards card
          ON card.tenant_id = series.tenant_id
         AND card.exam_series_id = series.id
         AND card.is_current = TRUE
        WHERE series.tenant_id = $1
          AND lower(series.status) <> 'archived'
        GROUP BY series.id, series.name, series.status, series.starts_on, series.ends_on, series.created_at
        ORDER BY series.created_at DESC
        LIMIT 10
      `,
      [tenantId],
    );

    const releaseQueueResult = await this.executeSql(
      `
        SELECT
          series.id::text,
          series.id::text AS exam_id,
          series.name AS title,
          lower(series.status) AS status,
          to_char(series.starts_on, 'YYYY-MM-DD') AS starts_on,
          to_char(series.ends_on, 'YYYY-MM-DD') AS ends_on,
          COUNT(card.id)::int AS total_report_cards,
          COUNT(card.id) FILTER (WHERE card.status = 'approved')::int AS approved_report_cards,
          COUNT(card.id) FILTER (WHERE card.status = 'published')::int AS published_report_cards,
          COUNT(card.id) FILTER (WHERE card.status NOT IN ('approved', 'published'))::int AS blocked_report_cards
        FROM exam_series series
        JOIN student_report_cards card
          ON card.tenant_id = series.tenant_id
         AND card.exam_series_id = series.id
         AND card.is_current = TRUE
        WHERE series.tenant_id = $1
          AND lower(series.status) NOT IN ('archived', 'published')
        GROUP BY series.id, series.name, series.status, series.starts_on, series.ends_on, series.created_at
        HAVING COUNT(card.id) > 0
           AND COUNT(card.id) FILTER (WHERE card.status = 'approved') > 0
           AND COUNT(card.id) FILTER (WHERE card.status NOT IN ('approved', 'published')) = 0
        ORDER BY series.created_at DESC
      `,
      [tenantId],
    );

    const mapSeriesResult = (row: any) => {
      const totalReportCards = Number(row.total_report_cards ?? 0);
      const approvedReportCards = Number(row.approved_report_cards ?? 0);
      const publishedReportCards = Number(row.published_report_cards ?? 0);
      const blockedReportCards = Number(row.blocked_report_cards ?? 0);
      return {
        id: row.id,
        exam_id: row.exam_id,
        title: row.title,
        status: row.status,
        startsOn: row.starts_on,
        endsOn: row.ends_on,
        totalReportCards,
        approvedReportCards,
        publishedReportCards,
        blockedReportCards,
        canPublish: totalReportCards > 0
          && approvedReportCards > 0
          && blockedReportCards === 0
          && row.status !== 'published',
      };
    };
    const recentResults = recentSeriesResult.rows.map(mapSeriesResult);
    const releaseQueue = releaseQueueResult.rows.map(mapSeriesResult);
    const reportsPending = releaseQueue.length;

    return {
      status: "active",
      activeExams: activeExamsRes.rows[0]?.count || 0,
      reportsPending,
      missingMarksAlerts: missingMarksRes.rows[0]?.count || 0,
      averageScore,
      performanceTrend: performanceTrendResult.rows.reverse().map((r: any) => ({
        label: r.label,
        value: Number(r.value)
      })),
      recentResults,
      releaseQueue,
    };
  }

  async getCommunicationOverview(tenantId: string) {
    const summaryResult = await this.executeSql(
      `
        SELECT
          COUNT(*) FILTER (
            WHERE lower(status) = 'accepted'
              AND provider_accepted_at IS NOT NULL
              AND timezone('Africa/Nairobi', provider_accepted_at)::date = timezone('Africa/Nairobi', NOW())::date
          )::int AS provider_accepted_today,
          COUNT(*) FILTER (WHERE lower(status) = 'failed')::int AS failed_messages,
          COUNT(*) FILTER (WHERE lower(status) IN ('pending', 'queued', 'processing'))::int AS pending_messages,
          COUNT(*) FILTER (WHERE lower(status) = 'deliveryunknown')::int AS delivery_unknown
        FROM communication_sms_outbox
        WHERE tenant_id = $1
      `,
      [tenantId],
    );

    const providerAcceptedToday = Number(summaryResult.rows[0]?.provider_accepted_today ?? 0);
    const failed = Number(summaryResult.rows[0]?.failed_messages ?? 0);
    const pending = Number(summaryResult.rows[0]?.pending_messages ?? 0);
    const deliveryUnknown = Number(summaryResult.rows[0]?.delivery_unknown ?? 0);

    const communicationTrendResult = await this.executeSql(
      `
        SELECT
          to_char(date_trunc('day', created_at), 'Dy') AS label,
          COUNT(*)::int AS value
        FROM communication_sms_outbox
        WHERE tenant_id = $1
          AND created_at >= date_trunc('day', NOW()) - INTERVAL '6 days'
        GROUP BY date_trunc('day', created_at)
        ORDER BY date_trunc('day', created_at)
      `,
      [tenantId],
    );

    const recentBroadcastsResult = await this.executeSql(
      `
        SELECT
          event.id::text,
          event.title,
          event.message AS body,
          event.status,
          event.payload ->> 'audience' AS audience,
          event.payload -> 'channels' AS channels,
          to_char(event.created_at, 'YYYY-MM-DD HH24:MI') AS time
        FROM workflow_events event
        WHERE event.tenant_id = $1
          AND event.event_type = 'communication.broadcast_created'
        ORDER BY event.created_at DESC
        LIMIT 5
      `,
      [tenantId]
    );

    return {
      status: "active",
      smsBalance: null,
      providerAcceptedToday,
      failedDeliveries: failed,
      pendingMessages: pending,
      deliveryUnknown,
      communicationTrend: communicationTrendResult.rows.map((row: any) => ({
        label: row.label,
        value: Number(row.value ?? 0),
      })),
      recentBroadcasts: recentBroadcastsResult.rows
    };
  }

  async getCommunicationTemplates(tenantId: string) {
    const result = await this.executeSql(
      `SELECT * FROM communication_templates WHERE tenant_id = $1 AND is_active = true ORDER BY name ASC`,
      [tenantId]
    );
    return result.rows;
  }

  async createCommunicationTemplate(tenantId: string, dto: any) {
    const result = await this.executeSql(
      `INSERT INTO communication_templates (tenant_id, name, type, subject, body, variables)
       VALUES ($1, $2, lower($3), $4, $5, $6::jsonb) RETURNING *`,
      [tenantId, dto.name, dto.type, dto.subject || null, dto.body, JSON.stringify(dto.variables || [])]
    );
    return result.rows[0];
  }

  async updateCommunicationTemplate(tenantId: string, id: string, dto: any) {
    const result = await this.executeSql(
      `UPDATE communication_templates 
       SET name = COALESCE($1, name), type = COALESCE(lower($2), type), subject = COALESCE($3, subject), body = COALESCE($4, body), variables = COALESCE($5::jsonb, variables), updated_at = NOW()
       WHERE tenant_id = $6 AND id = $7::uuid RETURNING *`,
      [dto.name, dto.type, dto.subject, dto.body, dto.variables ? JSON.stringify(dto.variables) : null, tenantId, id]
    );
    return result.rows[0];
  }

  async deleteCommunicationTemplate(tenantId: string, id: string) {
    const result = await this.executeSql(
      `UPDATE communication_templates SET is_active = false, updated_at = NOW() WHERE tenant_id = $1 AND id = $2::uuid RETURNING *`,
      [tenantId, id]
    );
    return result.rows[0];
  }

  async getClassesOverview(tenantId: string) {
    const classesQuery = await this.executeSql(
      `SELECT COUNT(*)::int AS count
       FROM class_sections section
       WHERE section.tenant_id = $1
         AND COALESCE(section.is_active, TRUE) = TRUE
         AND COALESCE(section.status, 'active') = 'active'
         AND section.archived_at IS NULL`,
      [tenantId]
    );
    const streamsQuery = await this.executeSql(
      `SELECT COUNT(*)::int AS count
       FROM class_streams stream
       JOIN class_sections section
         ON section.tenant_id = stream.tenant_id
        AND section.id::text = stream.class_section_id::text
       WHERE stream.tenant_id = $1
         AND COALESCE(stream.is_active, TRUE) = TRUE
         AND COALESCE(stream.status, 'active') = 'active'
         AND stream.archived_at IS NULL
         AND COALESCE(section.is_active, TRUE) = TRUE
         AND COALESCE(section.status, 'active') = 'active'
         AND section.archived_at IS NULL`,
      [tenantId]
    );
    
    const totalClasses = classesQuery.rows[0]?.count || 0;
    const totalStreams = streamsQuery.rows[0]?.count || 0;

    const distributionQuery = await this.executeSql(
      `SELECT COALESCE(cs.grade_level, cs.name) AS label,
              COUNT(DISTINCT sca.student_id)::int AS value
       FROM class_sections cs
       LEFT JOIN student_class_assignments sca
         ON sca.tenant_id = cs.tenant_id
        AND sca.class_section_id::text = cs.id::text
        AND sca.status = 'active'
       WHERE cs.tenant_id = $1
         AND COALESCE(cs.is_active, TRUE) = TRUE
         AND COALESCE(cs.status, 'active') = 'active'
         AND cs.archived_at IS NULL
       GROUP BY COALESCE(cs.grade_level, cs.name)
       ORDER BY label`,
      [tenantId]
    );

    const activeStudentCount = distributionQuery.rows.reduce(
      (total: number, row: any) => total + Number(row.value ?? 0),
      0,
    );

    return {
      status: totalClasses > 0 ? "active" : "setup_required",
      totalClasses,
      totalStreams,
      averageClassSize: totalClasses > 0 ? Math.round(activeStudentCount / totalClasses) : 0,
      capacityUtilization: 0,
      classDistribution: distributionQuery.rows,
      recentAdjustments: []
    };
  }

  async getSubjectsOverview(tenantId: string) {
    const subjectsQuery = await this.executeSql(
      `
        SELECT
          COUNT(*) FILTER (WHERE lower(subject.status) = 'active')::int AS total_subjects,
          COUNT(*) FILTER (
            WHERE lower(subject.status) = 'active'
              AND COALESCE(subject.is_compulsory, TRUE) = TRUE
          )::int AS core_subjects,
          COUNT(*) FILTER (
            WHERE lower(subject.status) = 'active'
              AND COALESCE(subject.is_compulsory, TRUE) = FALSE
          )::int AS elective_subjects,
          COUNT(DISTINCT department.id) FILTER (WHERE department.is_active = TRUE)::int AS departments
        FROM subjects subject
        LEFT JOIN academics_departments department
          ON department.tenant_id = subject.tenant_id
         AND department.id::text = subject.department_id::text
        WHERE subject.tenant_id = $1
      `,
      [tenantId],
    );

    const distributionResult = await this.executeSql(
      `
        SELECT
          COALESCE(department.name, 'Unassigned') AS label,
          COUNT(subject.id)::int AS value
        FROM subjects subject
        LEFT JOIN academics_departments department
          ON department.tenant_id = subject.tenant_id
         AND department.id::text = subject.department_id::text
        WHERE subject.tenant_id = $1
          AND lower(subject.status) = 'active'
        GROUP BY department.name
        ORDER BY label
      `,
      [tenantId],
    );

    const departmentHeadsResult = await this.executeSql(
      `
        SELECT
          department.id::text,
          department.name,
          department.head_of_department_user_id::text AS user_id,
          COALESCE(profile.display_name, 'Not assigned') AS head
        FROM academics_departments department
        LEFT JOIN staff_profiles profile
          ON profile.tenant_id = department.tenant_id
         AND profile.user_id = department.head_of_department_user_id
        WHERE department.tenant_id = $1
          AND department.is_active = TRUE
        ORDER BY department.name
      `,
      [tenantId],
    );

    const totalSubjects = Number(subjectsQuery.rows[0]?.total_subjects ?? 0);

    return {
      status: totalSubjects > 0 ? "active" : "setup_required",
      totalSubjects,
      coreSubjects: Number(subjectsQuery.rows[0]?.core_subjects ?? 0),
      electiveSubjects: Number(subjectsQuery.rows[0]?.elective_subjects ?? 0),
      departments: Number(subjectsQuery.rows[0]?.departments ?? 0),
      subjectDistribution: distributionResult.rows.map((row: any) => ({
        label: row.label,
        value: Number(row.value ?? 0),
      })),
      departmentHeads: departmentHeadsResult.rows,
    };
  }

  async getStaffOverview(tenantId: string) {
    const summaryResult = await this.executeSql(
      `
        SELECT
          COUNT(*) FILTER (WHERE profile.status IN ('active', 'on_leave', 'reactivated'))::int AS total_staff,
          COUNT(*) FILTER (
            WHERE profile.status IN ('active', 'on_leave', 'reactivated')
              AND (
                EXISTS (
                  SELECT 1
                  FROM staff_contracts contract
                  WHERE contract.tenant_id = profile.tenant_id
                    AND contract.staff_profile_id::text = profile.id::text
                    AND contract.approval_state = 'approved'
                    AND contract.role_title ILIKE '%teacher%'
                )
                OR EXISTS (
                  SELECT 1
                  FROM teacher_subject_assignments assignment
                  WHERE assignment.tenant_id = profile.tenant_id
                    AND assignment.teacher_user_id::text = profile.user_id::text
                    AND assignment.status = 'active'
                )
              )
          )::int AS teaching_staff,
          COUNT(*) FILTER (
            WHERE profile.status IN ('active', 'on_leave', 'reactivated')
              AND NOT EXISTS (
                SELECT 1
                FROM staff_contracts contract
                WHERE contract.tenant_id = profile.tenant_id
                  AND contract.staff_profile_id::text = profile.id::text
                  AND contract.approval_state = 'approved'
                  AND contract.role_title ILIKE '%teacher%'
              )
              AND NOT EXISTS (
                SELECT 1
                FROM teacher_subject_assignments assignment
                WHERE assignment.tenant_id = profile.tenant_id
                  AND assignment.teacher_user_id::text = profile.user_id::text
                  AND assignment.status = 'active'
              )
          )::int AS support_staff,
          COUNT(*) FILTER (WHERE profile.status = 'on_leave')::int AS on_leave
        FROM staff_profiles profile
        WHERE profile.tenant_id = $1
      `,
      [tenantId],
    );

    const distributionResult = await this.executeSql(
      `
        SELECT
          COALESCE(department.name, 'Unassigned') AS label,
          COUNT(profile.id)::int AS value
        FROM staff_profiles profile
        LEFT JOIN staff_departments department
          ON department.tenant_id = profile.tenant_id
         AND department.id = profile.department_id
        WHERE profile.tenant_id = $1
          AND profile.status IN ('active', 'on_leave', 'reactivated')
        GROUP BY department.name
        ORDER BY label
      `,
      [tenantId],
    );

    const onboardingResult = await this.executeSql(
      `
        SELECT
          profile.id::text,
          profile.display_name AS name,
          profile.staff_number,
          profile.status,
          to_char(profile.created_at, 'YYYY-MM-DD') AS date
        FROM staff_profiles profile
        WHERE profile.tenant_id = $1
        ORDER BY profile.created_at DESC
        LIMIT 5
      `,
      [tenantId],
    );

    const totalStaff = Number(summaryResult.rows[0]?.total_staff ?? 0);

    return {
      status: totalStaff > 0 ? "active" : "setup_required",
      totalStaff,
      teachingStaff: Number(summaryResult.rows[0]?.teaching_staff ?? 0),
      supportStaff: Number(summaryResult.rows[0]?.support_staff ?? 0),
      onLeave: Number(summaryResult.rows[0]?.on_leave ?? 0),
      staffDistribution: distributionResult.rows.map((row: any) => ({
        label: row.label,
        value: Number(row.value ?? 0),
      })),
      recentOnboarding: onboardingResult.rows,
    };
  }

  async getPrincipalOverview(tenantId: string) {
    const metricsResult = await this.executeSql(
      `
        SELECT
          (SELECT COUNT(*)::int FROM students WHERE tenant_id = $1 AND lower(status) = 'active') AS total_students,
          (
            SELECT COUNT(*)::int
            FROM staff_profiles
            WHERE tenant_id = $1
              AND status IN ('active', 'on_leave', 'reactivated')
          ) AS total_staff,
          (
            SELECT COUNT(*)::int
            FROM admin_incidents
            WHERE tenant_id = $1
              AND lower(status) IN ('reported', 'reviewed', 'escalated')
          ) AS active_issues,
          (
            SELECT COUNT(*)::int
            FROM dashboard_approval_requests
            WHERE tenant_id = $1
              AND upper(status) = 'PENDING'
          ) AS pending_approvals
      `,
      [tenantId],
    );
    const totalStudents = Number(metricsResult.rows[0]?.total_students ?? 0);
    const totalStaff = Number(metricsResult.rows[0]?.total_staff ?? 0);
    const activeIssues = Number(metricsResult.rows[0]?.active_issues ?? 0);
    const pendingApprovals = Number(metricsResult.rows[0]?.pending_approvals ?? 0);

    const recentActivityResult = await this.executeSql(
      `SELECT action as label, created_at as time FROM audit_logs WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 5`,
      [tenantId]
    );
    
    const recentActivity = recentActivityResult.rows.map((r: any) => ({
      label: r.label || 'System Action',
      time: new Date(r.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }));

    return {
      status: "active",
      totalStudents,
      totalStaff,
      activeIssues,
      pendingApprovals,
      recentActivity
    };
  }

  async getPrincipalVisitorsOverview(tenantId: string) {
    const [summaryResult, visitorsResult] = await Promise.all([
      this.executeSql(
        `
          SELECT
            COUNT(*) FILTER (WHERE time_in::date = CURRENT_DATE)::int AS checked_in_today,
            COUNT(*) FILTER (
              WHERE time_out IS NULL
                AND lower(status) IN ('active', 'flagged')
            )::int AS currently_on_premises,
            COUNT(*) FILTER (WHERE time_out::date = CURRENT_DATE)::int AS checked_out_today,
            COUNT(*) FILTER (WHERE lower(status) = 'flagged')::int AS flagged
          FROM visitors_logs
          WHERE tenant_id = $1
        `,
        [tenantId],
      ),
      this.executeSql(
        `
          SELECT
            visitor.id::text,
            visitor.visitor_name AS name,
            visitor.purpose,
            COALESCE(NULLIF(host.full_name, ''), '') AS host,
            visitor.time_in::text AS checked_in_at,
            visitor.time_out::text AS checked_out_at,
            INITCAP(REPLACE(visitor.status, '_', ' ')) AS status
          FROM visitors_logs visitor
          LEFT JOIN users host
            ON host.id::text = visitor.host_user_id::text
           AND EXISTS (
             SELECT 1
             FROM tenant_memberships membership
             WHERE membership.tenant_id = visitor.tenant_id
               AND membership.user_id = host.id
               AND lower(membership.status) = 'active'
           )
          WHERE visitor.tenant_id = $1
          ORDER BY visitor.time_in DESC
          LIMIT 50
        `,
        [tenantId],
      ),
    ]);

    const metrics = summaryResult.rows[0] ?? {};
    return {
      status: visitorsResult.rows.length > 0 ? 'active' : 'setup_required',
      metrics: {
        checkedInToday: Number(metrics.checked_in_today ?? 0),
        currentlyOnPremises: Number(metrics.currently_on_premises ?? 0),
        checkedOutToday: Number(metrics.checked_out_today ?? 0),
        flagged: Number(metrics.flagged ?? 0),
      },
      visitors: visitorsResult.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        purpose: row.purpose,
        host: row.host,
        checkedInAt: row.checked_in_at,
        checkedOutAt: row.checked_out_at ?? null,
        status: row.status,
      })),
    };
  }

  async getPrincipalHealthOverview(tenantId: string) {
    const [metricsResult, stockAlertsResult] = await Promise.all([
      this.executeSql(
        `
          WITH medicine_inventory AS (
            SELECT
              batch.medicine_id,
              COALESCE(SUM(batch.quantity_available) FILTER (
                WHERE batch.status IN ('active', 'near_expiry')
              ), 0)::numeric AS quantity_available,
              COALESCE(MAX(batch.minimum_stock_threshold::numeric), 0)::numeric AS reorder_level,
              MIN(batch.expiry_date::date) FILTER (
                WHERE batch.status IN ('active', 'near_expiry')
              ) AS earliest_expiry
            FROM clinic_medicine_batches batch
            WHERE batch.tenant_id = $1
            GROUP BY batch.medicine_id
          )
          SELECT
            (SELECT COUNT(*)::int FROM clinic_visits WHERE tenant_id = $1 AND visit_date::date = CURRENT_DATE) AS visits_today,
            (SELECT COUNT(*)::int FROM clinic_visits WHERE tenant_id = $1 AND status IN ('open', 'isolation')) AS open_cases,
            (SELECT COUNT(*)::int FROM clinic_visits WHERE tenant_id = $1 AND visit_date::date = CURRENT_DATE AND status = 'referred') AS referred_today,
            COUNT(*) FILTER (
              WHERE quantity_available > 0
                AND quantity_available <= reorder_level
            )::int AS low_stock_medicines,
            COUNT(*) FILTER (WHERE quantity_available <= 0)::int AS out_of_stock_medicines,
            COUNT(*) FILTER (
              WHERE earliest_expiry BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days'
            )::int AS expiring_soon
          FROM medicine_inventory
        `,
        [tenantId],
      ),
      this.executeSql(
        `
          WITH medicine_inventory AS (
            SELECT
              medicine.id,
              medicine.medicine_name,
              COALESCE(SUM(batch.quantity_available) FILTER (
                WHERE batch.status IN ('active', 'near_expiry')
              ), 0)::numeric AS quantity_available,
              COALESCE(MAX(batch.minimum_stock_threshold::numeric), 0)::numeric AS reorder_level,
              MIN(batch.expiry_date::date) FILTER (
                WHERE batch.status IN ('active', 'near_expiry')
              ) AS earliest_expiry
            FROM clinic_medicines medicine
            LEFT JOIN clinic_medicine_batches batch
              ON batch.tenant_id = medicine.tenant_id
             AND batch.medicine_id = medicine.id
            WHERE medicine.tenant_id = $1
              AND medicine.is_active = TRUE
            GROUP BY medicine.id, medicine.medicine_name
          )
          SELECT
            id::text,
            medicine_name,
            quantity_available,
            reorder_level,
            earliest_expiry::text,
            CASE
              WHEN quantity_available <= 0 THEN 'Out of stock'
              WHEN quantity_available <= reorder_level THEN 'Low stock'
              ELSE 'Expiring soon'
            END AS status
          FROM medicine_inventory
          WHERE quantity_available <= reorder_level
             OR earliest_expiry BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days'
          ORDER BY
            CASE WHEN quantity_available <= 0 THEN 0 WHEN quantity_available <= reorder_level THEN 1 ELSE 2 END,
            medicine_name
          LIMIT 50
        `,
        [tenantId],
      ),
    ]);

    const metrics = metricsResult.rows[0] ?? {};
    return {
      status: Number(metrics.visits_today ?? 0) > 0 || stockAlertsResult.rows.length > 0 ? 'active' : 'setup_required',
      metrics: {
        visitsToday: Number(metrics.visits_today ?? 0),
        openCases: Number(metrics.open_cases ?? 0),
        referredToday: Number(metrics.referred_today ?? 0),
        lowStockMedicines: Number(metrics.low_stock_medicines ?? 0),
        outOfStockMedicines: Number(metrics.out_of_stock_medicines ?? 0),
        expiringSoon: Number(metrics.expiring_soon ?? 0),
      },
      stockAlerts: stockAlertsResult.rows.map((row: any) => ({
        id: row.id,
        medicine: row.medicine_name,
        quantity: Number(row.quantity_available ?? 0),
        reorderLevel: Number(row.reorder_level ?? 0),
        expiryDate: row.earliest_expiry ?? null,
        status: row.status,
      })),
    };
  }

  async getPrincipalAuditOverview(tenantId: string) {
    const [metricsResult, eventsResult] = await Promise.all([
      this.executeSql(
        `
          SELECT
            COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE)::int AS actions_today,
            COUNT(*) FILTER (
              WHERE action ~* '(role|permission|fee|payment|mark|report|approval|waiver|reversal)'
            )::int AS sensitive_changes,
            COUNT(*) FILTER (WHERE action ~* '(fail|error|reject|deny)')::int AS failed_actions
          FROM audit_logs
          WHERE tenant_id = $1
        `,
        [tenantId],
      ),
      this.executeSql(
        `
          SELECT
            audit.id::text,
            audit.action,
            COALESCE(NULLIF(actor.full_name, ''), 'System') AS actor,
            COALESCE(NULLIF(audit.resource_type, ''), NULLIF(audit.entity_type, ''), 'unknown') AS resource_type,
            audit.created_at::text,
            CASE
              WHEN audit.action ~* '(fail|error)' THEN 'Failed'
              WHEN audit.action ~* '(reject|deny)' THEN 'Rejected'
              ELSE 'Recorded'
            END AS result
          FROM audit_logs audit
          LEFT JOIN users actor
            ON actor.id = audit.actor_user_id
           AND EXISTS (
             SELECT 1
             FROM tenant_memberships membership
             WHERE membership.tenant_id = audit.tenant_id
               AND membership.user_id = actor.id
           )
          WHERE audit.tenant_id = $1
          ORDER BY audit.created_at DESC
          LIMIT 100
        `,
        [tenantId],
      ),
    ]);

    const metrics = metricsResult.rows[0] ?? {};
    return {
      status: eventsResult.rows.length > 0 ? 'active' : 'setup_required',
      metrics: {
        actionsToday: Number(metrics.actions_today ?? 0),
        sensitiveChanges: Number(metrics.sensitive_changes ?? 0),
        failedActions: Number(metrics.failed_actions ?? 0),
      },
      events: eventsResult.rows.map((row: any) => ({
        id: row.id,
        action: row.action,
        actor: row.actor,
        resourceType: row.resource_type,
        createdAt: row.created_at,
        result: row.result,
      })),
    };
  }

  async getSchoolProfile(tenantId: string) {
    const tenantResult = await this.executeSql(
      `
        SELECT name, subdomain, status, settings, metadata
        FROM tenants
        WHERE tenant_id = $1
        LIMIT 1
      `,
      [tenantId],
    );

    const tenant = tenantResult.rows[0];
    if (!tenant) {
      return null;
    }
    const settings = tenant.settings && typeof tenant.settings === 'object'
      ? tenant.settings as Record<string, unknown>
      : {};
    const metadata = tenant.metadata && typeof tenant.metadata === 'object'
      ? tenant.metadata as Record<string, unknown>
      : {};
    const email = String(settings.email ?? '');
    const phone = String(settings.phone ?? '');
    const county = String(settings.county ?? settings.region ?? '');
    const address = String(settings.address ?? '');
    const rawLogoUrl = String(settings.logo_url ?? '');
    const logoStoragePath = String(settings.logo_storage_path ?? '') || extractLogoStoragePath(rawLogoUrl);

    return {
      status: email && phone && county && address ? "active" : "setup_required",
      schoolName: tenant.name,
      subdomain: tenant.subdomain,
      motto: String(settings.motto ?? ''),
      county,
      subCounty: String(settings.sub_county ?? ''),
      ward: String(settings.ward ?? ''),
      address,
      website: String(settings.website ?? ''),
      logoUrl: logoStoragePath
        ? '/api/school/identity/logo'
        : rawLogoUrl || null,
      logoStoragePath: logoStoragePath || null,
      registrationStatus: String(metadata.registration_status ?? tenant.status ?? 'active'),
      curriculum: String(settings.curriculum ?? ''),
      schoolType: String(settings.school_type ?? ''),
      contactInfo: {
        email,
        phone,
      },
    };
  }

  async updateSchoolProfile(tenantId: string, input: Record<string, string>) {
    const result = await this.executeSql(
      `
        UPDATE tenants
        SET
          name = $2,
          settings = COALESCE(settings, '{}'::jsonb) || $3::jsonb,
          updated_at = NOW()
        WHERE tenant_id = $1
        RETURNING tenant_id
      `,
      [
        tenantId,
        input.schoolName,
        JSON.stringify({
          motto: input.motto,
          curriculum: input.curriculum,
          school_type: input.schoolType,
          email: input.email,
          phone: input.phone,
          county: input.county,
          region: input.county,
          sub_county: input.subCounty,
          ward: input.ward,
          address: input.address,
          website: input.website,
        }),
      ],
    );
    if (!result.rows[0]) {
      return null;
    }
    return this.getSchoolProfile(tenantId);
  }

  async updateSchoolLogoUrl(tenantId: string, logoUrl: string, storagePath: string) {
    await this.executeSql(
      `
        UPDATE tenants
        SET settings = COALESCE(settings, '{}'::jsonb) || jsonb_build_object(
          'logo_url', $2::text,
          'logo_storage_path', $3::text
        ), updated_at = NOW()
        WHERE tenant_id = $1
      `,
      [tenantId, logoUrl, storagePath],
    );
  }

  async getApprovalsOverview(tenantId: string) {
    const summaryResult = await this.executeSql(
      `
        SELECT
          COUNT(*) FILTER (WHERE upper(status) = 'PENDING')::int AS pending_total,
          COUNT(*) FILTER (
            WHERE upper(status) = 'PENDING'
              AND lower(COALESCE(metadata ->> 'priority', 'normal')) IN ('urgent', 'critical', 'high')
          )::int AS urgent_approvals
        FROM dashboard_approval_requests
        WHERE tenant_id = $1
      `,
      [tenantId],
    );

    const categoriesResult = await this.executeSql(
      `
        SELECT
          initcap(replace(COALESCE(NULLIF(module, ''), NULLIF(approval_type, ''), 'other'), '_', ' ')) AS name,
          COUNT(*)::int AS pending,
          COUNT(*) FILTER (
            WHERE lower(COALESCE(metadata ->> 'priority', 'normal')) IN ('urgent', 'critical', 'high')
          )::int AS urgent
        FROM dashboard_approval_requests
        WHERE tenant_id = $1
          AND upper(status) = 'PENDING'
        GROUP BY COALESCE(NULLIF(module, ''), NULLIF(approval_type, ''), 'other')
        ORDER BY pending DESC, name
      `,
      [tenantId],
    );

    const recentApprovalsResult = await this.executeSql(
      `
        SELECT
          COALESCE(
            NULLIF(metadata ->> 'title', ''),
            initcap(replace(COALESCE(NULLIF(approval_type, ''), 'approval'), '_', ' '))
          ) AS title,
          to_char(COALESCE(decided_at, updated_at), 'YYYY-MM-DD') AS date
        FROM dashboard_approval_requests
        WHERE tenant_id = $1
          AND upper(status) IN ('APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED')
        ORDER BY COALESCE(decided_at, updated_at) DESC
        LIMIT 8
      `,
      [tenantId],
    );

    return {
      status: "active",
      pendingTotal: Number(summaryResult.rows[0]?.pending_total ?? 0),
      urgentApprovals: Number(summaryResult.rows[0]?.urgent_approvals ?? 0),
      categories: categoriesResult.rows.map((row: any) => ({
        name: row.name,
        pending: Number(row.pending ?? 0),
        urgent: Number(row.urgent ?? 0),
      })),
      recentApprovals: recentApprovalsResult.rows,
    };
  }

  async getPrincipalApprovalHistory(tenantId: string, actorUserId: string, actorRole: string) {
    const result = await this.executeSql(
      `
        SELECT
          approval.id::text,
          COALESCE(
            NULLIF(approval.metadata ->> 'title', ''),
            initcap(replace(COALESCE(NULLIF(approval.approval_type, ''), NULLIF(approval.module, ''), 'approval'), '_', ' '))
          ) AS title,
          lower(approval.status) AS status,
          approval.decision_note AS note,
          approval.module,
          approval.record_id,
          to_char(COALESCE(approval.decided_at, approval.updated_at), 'YYYY-MM-DD') AS date
        FROM dashboard_approval_requests approval
        WHERE approval.tenant_id::text = $1::text
          AND approval.approver_user_id = $2::uuid
          AND lower(approval.status) IN ('approved', 'rejected')
          AND regexp_replace(
            lower(btrim(COALESCE(approval.metadata ->> 'decisionByRole', approval.approver_role, ''))),
            '[^a-z0-9]+',
            '_',
            'g'
          ) = regexp_replace(lower(btrim($3)), '[^a-z0-9]+', '_', 'g')
        ORDER BY COALESCE(approval.decided_at, approval.updated_at) DESC
        LIMIT 10
      `,
      [tenantId, actorUserId, actorRole],
    );

    return result.rows;
  }

  async getPrincipalReportsOverview(tenantId: string) {
    const metricsResult = await this.executeSql(
      `
        SELECT
          COUNT(DISTINCT report_id)::int AS available_reports,
          COUNT(*) FILTER (WHERE filters @> '{"favorite": true}'::jsonb)::int AS favorite_reports,
          COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW()))::int AS recently_generated
        FROM report_snapshots
        WHERE tenant_id = $1
      `,
      [tenantId],
    );

    const categoriesResult = await this.executeSql(
      `
        WITH configured_categories AS (
          SELECT NULLIF(category ->> 'name', '') AS name, 0::int AS count
          FROM operations_reports report
          CROSS JOIN LATERAL jsonb_array_elements(report.content::jsonb) category
          WHERE report.tenant_id::text = $1::text
            AND report.title = 'Report Categories'
        ), generated_categories AS (
          SELECT
            initcap(replace(module, '-', ' ')) AS name,
            COUNT(DISTINCT report_id)::int AS count
          FROM report_snapshots
          WHERE tenant_id::text = $1::text
          GROUP BY module
        )
        SELECT name, SUM(count)::int AS count
        FROM (
          SELECT name, count FROM configured_categories WHERE name IS NOT NULL
          UNION ALL
          SELECT name, count FROM generated_categories
        ) categories
        GROUP BY name
        ORDER BY name
      `,
      [tenantId],
    );

    const scheduledReportsResult = await this.executeSql(
      `
        SELECT title, schedule
        FROM report_schedule_requests
        WHERE tenant_id = $1
          AND status = 'scheduled'
        ORDER BY created_at DESC
        LIMIT 10
      `,
      [tenantId],
    );

    return {
      status: "active",
      availableReports: Number(metricsResult.rows[0]?.available_reports ?? 0),
      favoriteReports: Number(metricsResult.rows[0]?.favorite_reports ?? 0),
      recentlyGenerated: Number(metricsResult.rows[0]?.recently_generated ?? 0),
      categories: categoriesResult.rows.map((row: any) => ({
        name: row.name,
        count: Number(row.count ?? 0),
      })),
      scheduledReports: scheduledReportsResult.rows,
    };
  }

  async getSetupChecklist(tenantId: string) {
    const profileComplete = await this.executeSql(
      `
        SELECT count(*)::int as count
        FROM tenants
        WHERE tenant_id = $1
          AND btrim(name) <> ''
          AND btrim(COALESCE(settings->>'email', '')) <> ''
          AND btrim(COALESCE(settings->>'phone', '')) <> ''
          AND btrim(COALESCE(settings->>'county', settings->>'region', '')) <> ''
          AND btrim(COALESCE(settings->>'address', '')) <> ''
      `,
      [tenantId]
    );
    
    const staffComplete = await this.executeSql(
      `
        SELECT COUNT(*)::int AS count
        FROM tenant_memberships membership
        JOIN roles role
          ON role.tenant_id = membership.tenant_id
         AND role.id = membership.role_id
        WHERE membership.tenant_id = $1
          AND membership.status = 'active'
          AND role.code IN ('principal', 'deputy_principal', 'school_admin')
      `,
      [tenantId]
    );

    const termsComplete = await this.executeSql(
      `SELECT count(*)::int as count FROM academic_terms WHERE tenant_id = $1`,
      [tenantId]
    );

    const gradesComplete = await this.executeSql(
      `SELECT count(*)::int as count FROM academics_grading_systems WHERE tenant_id = $1`,
      [tenantId]
    );

    const subjectsComplete = await this.executeSql(
      `SELECT count(*)::int as count FROM subjects WHERE tenant_id = $1`,
      [tenantId]
    );

    const studentsComplete = await this.executeSql(
      `SELECT count(*)::int as count FROM students WHERE tenant_id = $1 AND status = 'active'`,
      [tenantId]
    );

    const hasProfile = (profileComplete.rows[0]?.count || 0) > 0;
    const hasStaff = (staffComplete.rows[0]?.count || 0) > 0;
    const hasTerms = (termsComplete.rows[0]?.count || 0) > 0;
    const hasGrades = (gradesComplete.rows[0]?.count || 0) > 0;
    const hasSubjects = (subjectsComplete.rows[0]?.count || 0) > 0;
    const hasStudents = (studentsComplete.rows[0]?.count || 0) > 0;

    const completedTasks = [hasProfile, hasStaff, hasTerms, hasGrades, hasSubjects, hasStudents].filter(Boolean).length;
    const overallProgress = Math.round((completedTasks / 6) * 100);

    return {
      status: overallProgress === 100 ? "active" : "setup_required",
      overallProgress,
      tasks: [
        { id: "1", title: "Complete School Profile", completed: hasProfile, group: "General" },
        { id: "2", title: "Add Principal and Deputy", completed: hasStaff, group: "General" },
        { id: "3", title: "Configure Academic Term", completed: hasTerms, group: "Academics" },
        { id: "4", title: "Configure Grading System", completed: hasGrades, group: "Academics" },
        { id: "5", title: "Register Subjects", completed: hasSubjects, group: "Academics" },
        { id: "6", title: "Add Students", completed: hasStudents, group: "Data Entry" }
      ]
    };
  }

  async getAcademicSetupOverview(tenantId: string) {
    const termsQuery = await this.executeSql(
      `
        SELECT name, ends_on
        FROM academic_terms
        WHERE tenant_id = $1
          AND status = 'active'
          AND archived_at IS NULL
          AND ends_on >= CURRENT_DATE
        ORDER BY starts_on ASC
        LIMIT 1
      `,
      [tenantId]
    );
    
    const activeTermName = termsQuery.rows[0]?.name || "Not Configured";
    let weeksRemaining = 0;
    if (termsQuery.rows[0]?.ends_on) {
      const ms = new Date(termsQuery.rows[0].ends_on).getTime() - Date.now();
      weeksRemaining = Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24 * 7)));
    }

    const gradings = await this.executeSql(
      `SELECT count(*)::int as count FROM academics_grading_systems WHERE tenant_id = $1`,
      [tenantId]
    );

    const subjects = await this.executeSql(
      `SELECT count(*)::int as count FROM subjects WHERE tenant_id = $1`,
      [tenantId]
    );

    const teachers = await this.executeSql(
      `SELECT count(DISTINCT teacher_user_id)::int as count FROM teacher_subject_assignments WHERE tenant_id = $1`,
      [tenantId]
    );

    return {
      status: activeTermName !== "Not Configured" ? "active" : "setup_required",
      activeTerm: activeTermName,
      weeksRemaining,
      gradingsConfigured: (gradings.rows[0]?.count || 0) > 0,
      subjectsRegistered: subjects.rows[0]?.count || 0,
      teachersAssigned: teachers.rows[0]?.count || 0,
      pendingConfigurations: ((gradings.rows[0]?.count || 0) > 0 ? 0 : 1) + ((subjects.rows[0]?.count || 0) > 0 ? 0 : 1),
      recentChanges: []
    };
  }

  async getPrincipalSettings(tenantId: string, actorUserId: string) {
    const [preferencesResult, accountResult] = await Promise.all([
      this.executeSql(
        `
          SELECT payload, created_at::text AS updated_at
          FROM workflow_events
          WHERE tenant_id = $1
            AND source_user_id = $2::uuid
            AND event_type = 'principal.settings_updated'
            AND entity_type = 'principal_preferences'
            AND status = 'completed'
          ORDER BY created_at DESC
          LIMIT 1
        `,
        [tenantId, actorUserId],
      ),
      this.executeSql(
        `
          SELECT
            user_account.mfa_enabled,
            user_account.password_changed_at::text,
            EXISTS (
              SELECT 1
              FROM teacher_subject_assignments assignment
              WHERE assignment.tenant_id = membership.tenant_id
                AND assignment.teacher_user_id::text = user_account.id::text
                AND assignment.status = 'active'
                AND (assignment.effective_to IS NULL OR assignment.effective_to >= CURRENT_DATE)
            ) AS teaching_workspace_available
          FROM users user_account
          JOIN tenant_memberships membership
            ON membership.user_id = user_account.id
           AND membership.tenant_id = $1
           AND membership.status = 'active'
          WHERE user_account.id = $2::uuid
            AND user_account.status = 'active'
          LIMIT 1
        `,
        [tenantId, actorUserId],
      ),
    ]);

    const preferencePayload = preferencesResult.rows[0]?.payload;
    const stored = preferencePayload && typeof preferencePayload === 'object' && !Array.isArray(preferencePayload)
      ? preferencePayload as Record<string, any>
      : {};
    const storedNotifications = stored.notifications && typeof stored.notifications === 'object' && !Array.isArray(stored.notifications)
      ? stored.notifications as Record<string, unknown>
      : {};
    const storedDashboard = stored.dashboard && typeof stored.dashboard === 'object' && !Array.isArray(stored.dashboard)
      ? stored.dashboard as Record<string, unknown>
      : {};
    const account = accountResult.rows[0];
    const requestedTheme = String(storedDashboard.theme ?? 'system').toLowerCase();
    const requestedDefaultView = String(storedDashboard.defaultView ?? 'overview').toLowerCase();

    return {
      status: account ? "active" : "degraded",
      accountLinked: Boolean(account),
      updatedAt: preferencesResult.rows[0]?.updated_at ?? null,
      notifications: {
        emailAlerts: typeof storedNotifications.emailAlerts === 'boolean' ? storedNotifications.emailAlerts : true,
        smsAlerts: typeof storedNotifications.smsAlerts === 'boolean' ? storedNotifications.smsAlerts : false,
        dailyDigest: typeof storedNotifications.dailyDigest === 'boolean' ? storedNotifications.dailyDigest : true,
      },
      dashboard: {
        theme: ['system', 'dark', 'light'].includes(requestedTheme) ? requestedTheme : 'system',
        showTeachingWorkspace: Boolean(account?.teaching_workspace_available),
        defaultView: ['overview', 'academics', 'attendance', 'fees'].includes(requestedDefaultView)
          ? requestedDefaultView
          : 'overview',
      },
      security: {
        twoFactorAuth: Boolean(account?.mfa_enabled),
        lastPasswordChange: account?.password_changed_at ?? null,
      },
    };
  }

  async getPrincipalTeachingSchedule(tenantId: string, actorUserId: string) {
    const metrics = await this.executeSql(`
      SELECT
        (SELECT COUNT(DISTINCT class_section_id)::int FROM teacher_subject_assignments
          WHERE tenant_id = $1 AND teacher_user_id::text = $2 AND status = 'active'
            AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)) AS total_classes,
        (SELECT COUNT(*)::int FROM exam_marks WHERE tenant_id = $1
          AND entered_by_user_id::text = $2 AND status = 'draft') AS pending_grading
      WHERE EXISTS (SELECT 1 FROM tenant_memberships membership
        WHERE membership.tenant_id = $1 AND membership.user_id::text = $2 AND membership.status = 'active')
    `, [tenantId, actorUserId]);
    const lessons = await this.executeSql(`
      SELECT section.name AS class_name, subject.name AS subject_name,
        CONCAT(slot.starts_at::text, ' - ', slot.ends_at::text) AS lesson_time,
        slot.room_id AS room_name
      FROM timetable_slots slot
      JOIN class_sections section ON section.tenant_id = slot.tenant_id AND section.id::text = slot.class_section_id::text
      JOIN subjects subject ON subject.tenant_id = slot.tenant_id AND subject.id::text = slot.subject_id::text
      WHERE slot.tenant_id = $1 AND slot.teacher_id::text = $2
        AND EXISTS (SELECT 1 FROM tenant_memberships membership
          WHERE membership.tenant_id = slot.tenant_id AND membership.user_id::text = $2 AND membership.status = 'active')
        AND EXISTS (SELECT 1 FROM teacher_subject_assignments assignment
          WHERE assignment.tenant_id = slot.tenant_id AND assignment.teacher_user_id::text = $2
            AND assignment.class_section_id::text = slot.class_section_id::text
            AND assignment.subject_id::text = slot.subject_id::text AND assignment.status = 'active'
            AND (assignment.effective_to IS NULL OR assignment.effective_to >= CURRENT_DATE))
      ORDER BY CASE WHEN slot.day_of_week >= EXTRACT(ISODOW FROM CURRENT_DATE)::int THEN 0 ELSE 1 END,
        slot.day_of_week, slot.starts_at LIMIT 10
    `, [tenantId, actorUserId]);
    const upcomingClasses = lessons.rows.map((row: any) => ({
      class: row.class_name, subject: row.subject_name, time: row.lesson_time, room: row.room_name,
    }));
    return {
      status: upcomingClasses.length ? 'active' : 'empty',
      totalClasses: Number(metrics.rows[0]?.total_classes ?? 0),
      subjects: Array.from(new Set(upcomingClasses.map(lesson => lesson.subject))),
      upcomingClasses, pendingGrading: Number(metrics.rows[0]?.pending_grading ?? 0),
    };
  }

  async findPrincipalDashboardSnapshot(input: {
    tenant_id: string;
    enabled_module_hash: string;
    filter_hash: string;
  }): Promise<PrincipalExecutiveDashboard | null> {
    try {
      const result = await this.executeSql(
        `
          SELECT payload
          FROM principal_dashboard_snapshots
          WHERE tenant_id = $1
            AND enabled_module_hash = $2
            AND filter_hash = $3
            AND expires_at > NOW()
          ORDER BY generated_at DESC
          LIMIT 1
        `,
        [input.tenant_id, input.enabled_module_hash, input.filter_hash],
      );

      return (result.rows[0]?.payload ?? null) as PrincipalExecutiveDashboard | null;
    } catch (error) {
      const code = typeof error === 'object' && error ? (error as { code?: string }).code : undefined;

      if (code === '42P01' || code === '42703') {
        return null;
      }

      throw error;
    }
  }

  async upsertPrincipalDashboardSnapshot(input: {
    tenant_id: string;
    enabled_module_hash: string;
    filter_hash: string;
    payload: PrincipalExecutiveDashboard;
    ttl_seconds: number;
  }): Promise<void> {
    await this.executeSql(
      `
        INSERT INTO principal_dashboard_snapshots (
          tenant_id,
          enabled_module_hash,
          filter_hash,
          payload,
          generated_at,
          expires_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4::jsonb,
          NOW(),
          NOW() + ($5::int * INTERVAL '1 second')
        )
        ON CONFLICT (tenant_id, enabled_module_hash, filter_hash)
        DO UPDATE SET
          payload = EXCLUDED.payload,
          generated_at = EXCLUDED.generated_at,
          expires_at = EXCLUDED.expires_at,
          updated_at = NOW()
      `,
      [
        input.tenant_id,
        input.enabled_module_hash,
        input.filter_hash,
        JSON.stringify(input.payload),
        input.ttl_seconds,
      ],
    ).catch((error: unknown) => {
      const code = typeof error === 'object' && error ? (error as { code?: string }).code : undefined;

      if (code !== '42P01' && code !== '42703') {
        throw error;
      }
    });
  }

  createIncident(input: Record<string, unknown>) {
    return this.insertReturning(
      `
        INSERT INTO admin_incidents (
          tenant_id, title, description, severity, involved_parties, created_by
        )
        VALUES ($1, $2, $3, $4, $5::jsonb, $6::uuid)
        RETURNING *
      `,
      [
        input.tenant_id,
        input.title,
        input.description,
        input.severity,
        JSON.stringify(input.involved_parties ?? []),
        input.created_by,
      ],
    );
  }

  createAnnouncement(input: Record<string, unknown>) {
    return this.insertReturning(
      `
        INSERT INTO announcements (
          tenant_id, title, body, channels, audience, created_by
        )
        VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::uuid)
        RETURNING *
      `,
      [
        input.tenant_id,
        input.title,
        input.body,
        JSON.stringify(input.channels ?? []),
        JSON.stringify(input.audience ?? {}),
        input.created_by,
      ],
    );
  }

  createMeetingMinutes(input: Record<string, unknown>) {
    return this.insertReturning(
      `
        INSERT INTO meeting_minutes (
          tenant_id, meeting_date, title, agenda, minutes, action_items, created_by
        )
        VALUES ($1, $2::date, $3, $4::jsonb, $5, $6::jsonb, $7::uuid)
        RETURNING *
      `,
      [
        input.tenant_id,
        input.meeting_date,
        input.title,
        JSON.stringify(input.agenda ?? []),
        input.minutes,
        JSON.stringify(input.action_items ?? []),
        input.created_by,
      ],
    );
  }

  async appendAuditLog(input: Record<string, unknown>) {
    await this.executeSql(
      `
        INSERT INTO audit_logs (
          tenant_id, actor_user_id, request_id, action, resource_type, resource_id, metadata
        )
        VALUES ($1, $2::uuid, current_setting('app.request_id', true), $3, $4, $5::uuid, $6::jsonb)
      `,
      [
        input.tenant_id,
        input.actor_user_id ?? null,
        input.action,
        input.entity_type,
        input.entity_id ?? null,
        JSON.stringify(input.metadata ?? {}),
      ],
    );
  }

  private async insertReturning(sql: string, values: unknown[]) {
    const result = await this.executeSql(sql, values);

    return result.rows[0];
  }

  private async safeMetricQuery(
    sql: string,
    values: unknown[],
  ): Promise<Record<string, number | string>> {
    return this.safeQuery(sql, values, {}, (row) => this.toMetricObject(row ?? {}));
  }

  private async safeQuery<T>(
    sql: string,
    values: unknown[],
    _fallback: T,
    mapper: (row: Record<string, unknown> | undefined) => T,
  ): Promise<T> {
    const result = await this.executeSql(sql, values);

    return mapper(result.rows[0] as Record<string, unknown> | undefined);
  }

  private toMetricObject(row: Record<string, unknown>): Record<string, number | string> {
    return Object.fromEntries(
      Object.entries(row).map(([key, value]) => [key, this.toMetricValue(value)]),
    );
  }

  private toMetricValue(value: unknown): number | string {
    if (typeof value === 'number' || typeof value === 'string') {
      const numeric = Number(value);

      return Number.isFinite(numeric) && String(value).trim() !== '' ? numeric : value;
    }

    if (typeof value === 'bigint') {
      return Number(value);
    }

    return 0;
  }

  private toObject(value: unknown): Record<string, number> {
    if (!value) {
      return {};
    }

    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as Record<string, number>;
      } catch {
        return {};
      }
    }

    if (typeof value === 'object') {
      return value as Record<string, number>;
    }

    return {};
  }

  async scheduleReport(data: { tenant_id: string; user_id: string; title: string; schedule: string }) {
    const result = await this.executeSql(
      `
        INSERT INTO report_schedule_requests (
          tenant_id, title, schedule, requested_by, metadata
        )
        VALUES ($1, $2, $3, $4::uuid, $5::jsonb)
        RETURNING *
      `,
      [
        data.tenant_id,
        data.title,
        data.schedule,
        data.user_id,
        JSON.stringify({ source_dashboard: 'principal-command' }),
      ],
    );
    return result.rows[0];
  }

  async createPrincipalWorkflowAction(data: {
    tenant_id: string;
    user_id: string;
    event_type: string;
    entity_type: string;
    entity_id?: string | null;
    title: string;
    message: string;
    payload?: Record<string, unknown>;
    target_roles?: string[];
    status?: string;
  }) {
    const result = await this.executeSql(
      `
        INSERT INTO workflow_events (
          tenant_id, source_user_id, source_role, target_roles, event_type, entity_type, entity_id, title, message, priority, status, payload
        )
        VALUES ($1, $2::uuid, 'principal', $3::jsonb, $4, $5, $6, $7, $8, 'normal', $9, $10::jsonb)
        RETURNING *
      `,
      [
        data.tenant_id,
        data.user_id,
        JSON.stringify(data.target_roles ?? ['principal']),
        data.event_type,
        data.entity_type,
        data.entity_id ?? null,
        data.title,
        data.message,
        data.status ?? 'pending',
        JSON.stringify(data.payload ?? {}),
      ],
    );
    return result.rows[0];
  }

  async createCommunicationBroadcast(data: { tenant_id: string; user_id: string; audience: string; target_class?: string | null; message: string; channels?: string[] }) {
    const normalizedChannels = (data.channels ?? ['in_app']).map((channel) => String(channel).toLowerCase());
    const result = await this.executeSql(
      `
        WITH sms_recipients AS (
          SELECT
            guardian.phone,
            MIN(guardian.id::text) AS recipient_identity
          FROM student_guardians guardian
          JOIN students student
            ON student.tenant_id = guardian.tenant_id
           AND student.id::text = guardian.student_id::text
          LEFT JOIN student_class_assignments assignment
            ON assignment.tenant_id = student.tenant_id
           AND assignment.student_id::text = student.id::text
           AND assignment.status = 'active'
          LEFT JOIN class_sections section
            ON section.tenant_id = assignment.tenant_id
           AND section.id::text = assignment.class_section_id::text
          WHERE guardian.tenant_id = $1
            AND guardian.status = 'active'
            AND guardian.phone IS NOT NULL
            AND btrim(guardian.phone) <> ''
            AND (
              $3 = 'parents'
              OR (
                $3 = 'class'
                AND lower(btrim(COALESCE(section.custom_label, section.name, section.grade_level, ''))) = lower(btrim($6))
              )
            )
          GROUP BY guardian.phone
          ORDER BY guardian.phone
          LIMIT 500
        ), notification_recipients AS (
          SELECT DISTINCT guardian.user_id
          FROM student_guardians guardian
          JOIN students student
            ON student.tenant_id = guardian.tenant_id
           AND student.id::text = guardian.student_id::text
          JOIN tenant_memberships membership
            ON membership.tenant_id = guardian.tenant_id
           AND membership.user_id = guardian.user_id
           AND lower(membership.status::text) = 'active'
          LEFT JOIN student_class_assignments assignment
            ON assignment.tenant_id = student.tenant_id
           AND assignment.student_id::text = student.id::text
           AND assignment.status = 'active'
          LEFT JOIN class_sections section
            ON section.tenant_id = assignment.tenant_id
           AND section.id::text = assignment.class_section_id::text
          WHERE guardian.tenant_id = $1
            AND guardian.status = 'active'
            AND guardian.user_id IS NOT NULL
            AND (
              $3 = 'parents'
              OR (
                $3 = 'class'
                AND lower(btrim(COALESCE(section.custom_label, section.name, section.grade_level, ''))) = lower(btrim($6))
              )
            )

          UNION

          SELECT DISTINCT profile.user_id
          FROM staff_profiles profile
          WHERE profile.tenant_id = $1
            AND $3 = 'staff'
            AND profile.user_id IS NOT NULL
            AND profile.status IN ('active', 'on_leave', 'reactivated')
        ), sms_insert AS (
          INSERT INTO communication_sms_outbox (
            message,
            recipient_phone,
            sent_by,
            status,
            tenant_id,
            updated_at,
            dispatch_key
          )
          SELECT
            $4,
            recipient.phone,
            $2::uuid,
            'Pending',
            $1,
            NOW(),
            'principal-broadcast:'
              || NULLIF(current_setting('app.request_id', true), '')
              || ':' || recipient.recipient_identity
          FROM sms_recipients recipient
          WHERE 'sms' = ANY($5::text[])
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
          FROM sms_insert
        ), event_insert AS (
          INSERT INTO workflow_events (
            tenant_id,
            source_user_id,
            source_role,
            target_roles,
            event_type,
            entity_type,
            title,
            message,
            priority,
            status,
            payload
          )
          SELECT
            $1,
            $2::uuid,
            'principal',
            $7::jsonb,
            'communication.broadcast_created',
            'communication_broadcast',
            'Broadcast to ' || $3,
            $4,
            'normal',
            CASE
              WHEN (SELECT needs_review_count FROM sms_outcome) > 0 THEN 'needs_review'
              WHEN (SELECT queued_count FROM sms_outcome) > 0 THEN 'pending'
              WHEN (SELECT processing_count FROM sms_outcome) > 0 THEN 'processing'
              WHEN (SELECT accepted_count FROM sms_outcome) > 0 THEN 'provider_accepted'
              ELSE 'sent'
            END,
            $8::jsonb || jsonb_build_object(
              'sms_queued_count', (SELECT queued_count FROM sms_outcome),
              'sms_processing_count', (SELECT processing_count FROM sms_outcome),
              'sms_accepted_count', (SELECT accepted_count FROM sms_outcome),
              'sms_needs_review_count', (SELECT needs_review_count FROM sms_outcome),
              'sms_outbox_count', (SELECT outbox_count FROM sms_outcome)
            )
          WHERE (
            ('sms' = ANY($5::text[]) AND (SELECT outbox_count FROM sms_outcome) > 0)
            OR ('in_app' = ANY($5::text[]) AND EXISTS (SELECT 1 FROM notification_recipients))
          )
          RETURNING *
        ), notification_insert AS (
          INSERT INTO notifications (
            tenant_id,
            notification_key,
            recipient_user_id,
            type,
            title,
            body,
            status,
            source_module,
            source_record_id,
            metadata
          )
          SELECT
            $1,
            'principal-broadcast-' || event.id::text || '-' || recipient.user_id::text,
            recipient.user_id,
            'communication.broadcast_created',
            event.title,
            $4,
            'unread',
            'admin-command',
            event.id::text,
            $8::jsonb
          FROM notification_recipients recipient
          CROSS JOIN event_insert event
          WHERE 'in_app' = ANY($5::text[])
          ON CONFLICT (tenant_id, notification_key) DO NOTHING
          RETURNING id
        )
        SELECT
          event.*,
          (SELECT outbox_count FROM sms_outcome) AS sms_recipient_count,
          (SELECT queued_count FROM sms_outcome) AS sms_queued_count,
          (SELECT processing_count FROM sms_outcome) AS sms_processing_count,
          (SELECT accepted_count FROM sms_outcome) AS sms_accepted_count,
          (SELECT needs_review_count FROM sms_outcome) AS sms_needs_review_count,
          (SELECT outbox_count FROM sms_outcome) AS sms_outbox_count,
          (SELECT COUNT(*)::int FROM notification_insert) AS in_app_recipient_count
        FROM event_insert event
      `,
      [
        data.tenant_id,
        data.user_id,
        data.audience,
        data.message,
        normalizedChannels,
        data.target_class ?? null,
        // The exact users above receive the broadcast. Keeping the shared event
        // Principal-only prevents a class/parent broadcast from reappearing in
        // every user inbox through the role-wide workflow feed.
        JSON.stringify(['principal']),
        JSON.stringify({
          audience: data.audience,
          channels: normalizedChannels,
          target_class: data.target_class ?? null,
          source_dashboard: 'principal-command',
        }),
      ],
    );
    const event = result.rows[0];
    return {
      broadcast: event ? {
        id: event.id,
        audience: data.audience,
        target_class: data.target_class ?? null,
        message: data.message,
        channels: normalizedChannels,
        status: event.status,
        created_at: event.created_at,
      } : undefined,
      event,
      smsRecipientCount: Number(event?.sms_recipient_count ?? 0),
      smsQueuedCount: Number(event?.sms_queued_count ?? event?.sms_recipient_count ?? 0),
      smsProcessingCount: Number(event?.sms_processing_count ?? 0),
      smsAcceptedCount: Number(event?.sms_accepted_count ?? 0),
      smsNeedsReviewCount: Number(event?.sms_needs_review_count ?? 0),
      smsOutboxCount: Number(event?.sms_outbox_count ?? event?.sms_recipient_count ?? 0),
      inAppRecipientCount: Number(event?.in_app_recipient_count ?? 0),
    };
  }

  async logAbsence(data: { tenant_id: string; user_id: string; student_id: string; date: string; reason: string; is_excused: boolean }) {
    const result = await this.executeSql(
      `
        INSERT INTO attendance_records (
          tenant_id, student_id, attendance_date, status, notes, metadata
        )
        SELECT $1, student.id, $3::date, $4, $5, $6::jsonb
        FROM students student
        WHERE student.tenant_id = $1
          AND student.id = $2::uuid
          AND lower(student.status) = 'active'
        ON CONFLICT (tenant_id, student_id, attendance_date)
        DO UPDATE SET
          status = EXCLUDED.status,
          notes = EXCLUDED.notes,
          metadata = attendance_records.metadata || EXCLUDED.metadata,
          last_modified_at = NOW(),
          updated_at = NOW()
        RETURNING *
      `,
      [
        data.tenant_id,
        data.student_id,
        data.date,
        data.is_excused ? 'excused' : 'absent',
        data.reason,
        JSON.stringify({ source_dashboard: 'principal-command', logged_by: data.user_id }),
      ],
    );
    return result.rows[0];
  }

  async reportIncident(data: { tenant_id: string; user_id: string; student_id: string; category: string; severity: string; description: string }) {
    const result = await this.executeSql(
      `
        INSERT INTO admin_incidents (
          created_by, description, involved_parties, severity, tenant_id, title, updated_at
        )
        VALUES ($1::uuid, $2, $3::jsonb, $4, $5, $6, NOW())
        RETURNING *
      `,
      [
        data.user_id,
        data.description,
        JSON.stringify([{ type: 'student', id: data.student_id }]),
        data.severity,
        data.tenant_id,
        data.category,
      ],
    );
    return result.rows[0];
  }
}

function extractLogoStoragePath(logoUrl: string): string {
  if (!logoUrl) {
    return '';
  }

  try {
    const pathname = /^https?:\/\//i.test(logoUrl)
      ? new URL(logoUrl).pathname
      : logoUrl.split('?')[0];
    const match = pathname.match(/^\/api\/v1\/files\/(.+)\/download$/);

    return match?.[1] ? decodeURIComponent(match[1]) : '';
  } catch {
    return '';
  }
}
