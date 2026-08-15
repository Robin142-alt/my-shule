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
              (SELECT COUNT(*)::int FROM clinic_visits WHERE tenant_id = $1 AND visit_date = CURRENT_DATE) AS clinic_visits_today,
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
          total_collections_minor,
          total_arrears_minor
        FROM tenant_finance_summary
        WHERE tenant_id = $1 AND current_term = 'Term 2'
      `,
      [tenantId],
    ).catch(() => ({ rows: [] }));

    const waiversResult = await this.executeSql(
      `
        SELECT
          waiver_number AS id,
          student_name AS student,
          class_name AS class,
          amount_minor AS amount,
          reason,
          requested_at AS date
        FROM tenant_pending_waivers
        WHERE tenant_id = $1 AND status = 'pending'
        ORDER BY requested_at DESC
        LIMIT 5
      `,
      [tenantId],
    ).catch(() => ({ rows: [] }));

    const collectionsMinor = summaryResult.rows[0]?.total_collections_minor || 0;
    const arrearsMinor = summaryResult.rows[0]?.total_arrears_minor || 0;

    const trendResult = await this.executeSql(
      `SELECT
         'Week ' || extract(week from paid_at) as label,
         SUM(amount_paid_minor) as total
       FROM invoices
       WHERE tenant_id = $1 AND paid_at >= CURRENT_DATE - INTERVAL '35 days'
       GROUP BY extract(week from paid_at)
       ORDER BY extract(week from paid_at) ASC
       LIMIT 5`,
      [tenantId]
    ).catch(() => ({ rows: [] }));

    const collectionData = trendResult.rows.length > 0 ? trendResult.rows.map((row: any) => {
      const amount = Number(row.total);
      return {
        label: row.label,
        value: amount > 0 ? 100 : 0, // In a real scenario, this would be a percentage against a target
        amount: `${(amount / 100000).toFixed(0)}K`
      };
    }) : [
      { label: "Week 1", value: 10, amount: "10%" },
      { label: "Week 2", value: 20, amount: "20%" },
      { label: "Week 3", value: 30, amount: "30%" },
      { label: "Week 4", value: 40, amount: "40%" },
      { label: "Week 5", value: collectionsMinor > 0 ? 100 : 0, amount: "Current" },
    ];

    return {
      status: "active",
      collectionsToday: `KES ${(collectionsMinor / 100).toLocaleString()}`,
      outstandingInvoices: `KES ${(arrearsMinor / 100).toLocaleString()}`,
      collectionData,
      pendingWaivers: waiversResult.rows.map(row => ({
        ...row,
        amount: `KES ${(row.amount / 100).toLocaleString()}`,
        date: new Date(row.date).toLocaleDateString(),
      }))
    };
  }

  async getStudentsOverview(tenantId: string) {
    const summaryResult = await this.executeSql(
      `
        SELECT
          COUNT(*) FILTER (WHERE student_status = 'ACTIVE')::int AS total_students,
          COUNT(*) FILTER (WHERE gender ILIKE 'male')::int AS boys,
          COUNT(*) FILTER (WHERE gender ILIKE 'female')::int AS girls
        FROM students
              WHERE school_id = $1
      `,
      [tenantId],
    ).catch(() => ({ rows: [] }));

    const recentAdmissionsResult = await this.executeSql(
      `
        SELECT
          s.admission_number AS id,
          s.first_name || ' ' || s.last_name AS name,
          COALESCE(s.gender, 'Not Specified') AS gender,
          COALESCE(c.name, 'Unassigned') AS class,
          to_char(s.created_at, 'YYYY-MM-DD') AS admission_date
        FROM students s
        LEFT JOIN classes c ON s.current_class_id = c.id
              WHERE s.school_id = $1
        ORDER BY s.created_at DESC
        LIMIT 5
      `,
      [tenantId],
    ).catch(() => ({ rows: [] }));

    const totalStudents = summaryResult.rows[0]?.total_students || 0;
    const boys = summaryResult.rows[0]?.boys || 0;
    const girls = summaryResult.rows[0]?.girls || 0;

    const trendResult = await this.executeSql(
      `SELECT
         to_char(date_trunc('month', created_at), 'Mon YYYY') as label,
         COUNT(*)::int as value
       FROM students
       WHERE school_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '3 months'
       GROUP BY date_trunc('month', created_at)
       ORDER BY date_trunc('month', created_at) ASC
       LIMIT 3`,
      [tenantId]
    ).catch(() => ({ rows: [] }));

    let populationTrend = trendResult.rows.map((row: any) => ({
      label: row.label,
      value: row.value
    }));

    if (populationTrend.length === 0) {
      populationTrend = [
        { label: "Historical", value: totalStudents > 0 ? Math.max(0, totalStudents - 5) : 0 },
        { label: "Previous", value: totalStudents > 0 ? Math.max(0, totalStudents - 2) : 0 },
        { label: "Current", value: totalStudents }
      ];
    }

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
          COUNT(*) FILTER (WHERE status IN ('reported', 'reviewed', 'escalated'))::int AS open_cases,
          COUNT(*) FILTER (WHERE severity = 'critical')::int AS critical_cases,
          COUNT(*) FILTER (WHERE status = 'escalated')::int AS escalations
        FROM admin_incidents
        WHERE tenant_id = $1
      `,
      [tenantId],
    ).catch(() => ({ rows: [] }));

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
    ).catch(() => ({ rows: [] }));

    const studentsResult = await this.executeSql(
      `
        SELECT
          s.id,
          CONCAT_WS(' ', s.first_name, s.last_name) AS name,
          s.admission_number,
          COALESCE(c.name, 'Unassigned') AS class
        FROM students s
        LEFT JOIN classes c ON s.current_class_id = c.id
        WHERE s.school_id = $1
        ORDER BY s.first_name ASC, s.last_name ASC
        LIMIT 250
      `,
      [tenantId],
    ).catch(() => ({ rows: [] }));

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
    ).catch(() => ({ rows: [] }));

    let incidentTrend = trendResult.rows.map((row: any) => ({
      label: row.label,
      value: row.value
    }));

    if (incidentTrend.length === 0) {
      incidentTrend = [
        { label: "Historical", value: Math.max(0, openCases - 2) },
        { label: "Recent", value: Math.max(0, openCases - 1) },
        { label: "Current", value: openCases }
      ];
    }

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
        SELECT
          COUNT(*) FILTER (WHERE status = 'Present')::int AS present_today,
          COUNT(*) FILTER (WHERE status = 'Absent')::int AS absent_today,
          COUNT(*) FILTER (WHERE status = 'Late')::int AS late_today
        FROM academics_attendance
        WHERE tenant_id = $1
          AND attendance_date::text = CURRENT_DATE::text
      `,
      [tenantId],
    ).catch(() => ({ rows: [] }));

    const present = summaryResult.rows[0]?.present_today || 0;
    const absent = summaryResult.rows[0]?.absent_today || 0;
    const late = summaryResult.rows[0]?.late_today || 0;

    const recentAbsencesResult = await this.executeSql(
      `
        SELECT
          ar.id,
          ar.student_id,
          CONCAT_WS(' ', s.first_name, s.last_name) AS student_name,
          s.admission_number,
          to_char(ar.attendance_date, 'YYYY-MM-DD') AS date,
          ar.status,
          ar.notes AS reason
        FROM attendance_records ar
        JOIN students s ON s.id = ar.student_id AND s.school_id = ar.tenant_id
        WHERE ar.tenant_id = $1
          AND ar.status IN ('absent', 'excused_absent')
        ORDER BY ar.attendance_date DESC, ar.created_at DESC
        LIMIT 10
      `,
      [tenantId],
    ).catch(() => ({ rows: [] }));

    const studentsResult = await this.executeSql(
      `
        SELECT
          s.id,
          CONCAT_WS(' ', s.first_name, s.last_name) AS name,
          s.admission_number,
          COALESCE(c.name, 'Unassigned') AS class
        FROM students s
        LEFT JOIN classes c ON s.current_class_id = c.id
        WHERE s.school_id = $1
        ORDER BY s.first_name ASC, s.last_name ASC
        LIMIT 250
      `,
      [tenantId],
    ).catch(() => ({ rows: [] }));

    const trendResult = await this.executeSql(
      `SELECT
         to_char(attendance_date, 'Dy') as label,
         ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'Present') / NULLIF(COUNT(*), 0), 0)::int as value
       FROM academics_attendance
       WHERE tenant_id = $1 AND attendance_date::text >= (CURRENT_DATE - INTERVAL '5 days')::date::text
       GROUP BY attendance_date
       ORDER BY attendance_date ASC
       LIMIT 5`,
      [tenantId]
    ).catch(() => ({ rows: [] }));

    let attendanceTrend = trendResult.rows.map((row: any) => ({
      label: row.label,
      value: row.value
    }));

    if (attendanceTrend.length === 0) {
      attendanceTrend = [
        { label: "Historical", value: present > 0 ? 95 : 0 },
        { label: "Recent", value: present > 0 ? 98 : 0 },
        { label: "Current", value: present > 0 ? 100 : 0 }
      ];
    }

    return {
      status: "active",
      present,
      absent,
      late,
      chronicAbsenteeism: 0, // Requires deeper historical aggregation
      attendanceTrend,
      recentAbsences: recentAbsencesResult.rows,
      students: studentsResult.rows
    };
  }

  async getAcademicsOverview(tenantId: string) {
    const summaryResult = await this.executeSql(
      `
        SELECT
          COUNT(*)::int AS active_assignments,
          COUNT(*) FILTER (WHERE status = 'Draft')::int AS draft_assignments
        FROM academics_assignments
        WHERE tenant_id = $1
          AND due_date >= CURRENT_DATE
      `,
      [tenantId],
    ).catch(() => ({ rows: [] }));

    const activeAssignments = summaryResult.rows[0]?.active_assignments || 0;

    const avgScoreRes = await this.executeSql(
      `SELECT COALESCE(ROUND(AVG(score), 2), 0)::numeric as avg FROM exam_marks WHERE tenant_id = $1`,
      [tenantId]
    ).catch(() => ({ rows: [{ avg: 0 }] }));
    const averageScore = Number(avgScoreRes.rows[0]?.avg || 0);

    return {
      status: "active",
      activeAssignments,
      syllabusCoverage: 0,
      averageScore,
      performanceTrend: [],
      departmentPerformance: []
    };
  }

  async getExamsOverview(tenantId: string) {
    const summaryResult = await this.executeSql(
      `
        SELECT
          COUNT(*)::int AS pending_reviews,
          COUNT(*) FILTER (WHERE status = 'Approved')::int AS approved_reviews
        FROM report_readiness_reviews
        WHERE tenant_id = $1
      `,
      [tenantId],
    ).catch(() => ({ rows: [] }));

    const activeExamsRes = await this.executeSql(
      `SELECT count(*)::int as count FROM exam_series WHERE tenant_id = $1 AND ends_on >= CURRENT_DATE`,
      [tenantId]
    ).catch(() => ({ rows: [{ count: 0 }] }));

    const missingMarksRes = await this.executeSql(
      `SELECT count(*)::int as count FROM exam_marks WHERE tenant_id = $1 AND status = 'draft'`,
      [tenantId]
    ).catch(() => ({ rows: [{ count: 0 }] }));

    const avgScoreRes = await this.executeSql(
      `SELECT COALESCE(ROUND(AVG(score), 2), 0)::numeric as avg FROM exam_marks WHERE tenant_id = $1 AND status != 'draft'`,
      [tenantId]
    ).catch(() => ({ rows: [{ avg: 0 }] }));

    const averageScore = Number(avgScoreRes.rows[0]?.avg || 0);

    const performanceTrendResult = await this.executeSql(
      `SELECT
         e.name as label,
         COALESCE(ROUND(AVG(m.score), 2), 0)::numeric as value
       FROM exam_series e
       JOIN exam_marks m ON m.exam_series_id = e.id AND m.tenant_id = e.tenant_id
       WHERE e.tenant_id = $1 AND m.status != 'draft'
       GROUP BY e.id, e.name, e.created_at
       ORDER BY e.created_at DESC
       LIMIT 5`,
      [tenantId]
    ).catch(() => ({ rows: [] }));

    return {
      status: "active",
      activeExams: activeExamsRes.rows[0]?.count || 0,
      reportsPending: summaryResult.rows[0]?.pending_reviews || 0,
      missingMarksAlerts: missingMarksRes.rows[0]?.count || 0,
      averageScore,
      performanceTrend: performanceTrendResult.rows.reverse().map((r: any) => ({
        label: r.label,
        value: Number(r.value)
      })),
      recentResults: []
    };
  }

  async getCommunicationOverview(tenantId: string) {
    const summaryResult = await this.executeSql(
      `
        SELECT
          COUNT(*)::int AS total_sent,
          COUNT(*) FILTER (WHERE status = 'Failed')::int AS failed_messages,
          COUNT(*) FILTER (WHERE status = 'Pending')::int AS pending_messages
        FROM communication_sms_outbox
        WHERE tenant_id = $1
      `,
      [tenantId],
    ).catch(() => ({ rows: [] }));

    const totalSent = summaryResult.rows[0]?.total_sent || 0;
    const failed = summaryResult.rows[0]?.failed_messages || 0;
    const pending = summaryResult.rows[0]?.pending_messages || 0;

    const recentBroadcastsResult = await this.executeSql(
      `SELECT
         message as body,
         status,
         to_char(created_at, 'YYYY-MM-DD HH24:MI') as time
       FROM communication_sms_outbox
       WHERE tenant_id = $1
       ORDER BY created_at DESC
       LIMIT 5`,
      [tenantId]
    ).catch(() => ({ rows: [] }));

    return {
      status: "active",
      smsBalance: 0,
      messagesSentToday: totalSent,
      failedDeliveries: failed,
      pendingMessages: pending,
      communicationTrend: [
        { label: "Mon", value: 120 },
        { label: "Tue", value: 85 },
        { label: "Wed", value: 95 },
        { label: "Thu", value: 150 },
        { label: "Fri", value: totalSent }
      ],
      recentBroadcasts: recentBroadcastsResult.rows
    };
  }

  async getCommunicationTemplates(tenantId: string) {
    const result = await this.executeSql(
      `SELECT * FROM communication_templates WHERE tenant_id = $1 AND is_active = true ORDER BY name ASC`,
      [tenantId]
    ).catch(() => ({ rows: [] }));
    return result.rows;
  }

  async createCommunicationTemplate(tenantId: string, dto: any) {
    const result = await this.executeSql(
      `INSERT INTO communication_templates (tenant_id, name, type, subject, body, variables)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [tenantId, dto.name, dto.type, dto.subject || null, dto.body, JSON.stringify(dto.variables || [])]
    ).catch(() => ({ rows: [] }));
    return result.rows[0];
  }

  async updateCommunicationTemplate(tenantId: string, id: string, dto: any) {
    const result = await this.executeSql(
      `UPDATE communication_templates 
       SET name = COALESCE($1, name), type = COALESCE($2, type), subject = COALESCE($3, subject), body = COALESCE($4, body), variables = COALESCE($5::jsonb, variables), updated_at = NOW()
       WHERE tenant_id = $6 AND id = $7::uuid RETURNING *`,
      [dto.name, dto.type, dto.subject, dto.body, dto.variables ? JSON.stringify(dto.variables) : null, tenantId, id]
    ).catch(() => ({ rows: [] }));
    return result.rows[0];
  }

  async deleteCommunicationTemplate(tenantId: string, id: string) {
    const result = await this.executeSql(
      `UPDATE communication_templates SET is_active = false, updated_at = NOW() WHERE tenant_id = $1 AND id = $2::uuid RETURNING *`,
      [tenantId, id]
    ).catch(() => ({ rows: [] }));
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
      `SELECT count(*)::int as count FROM subjects WHERE tenant_id = $1`,
      [tenantId]
    ).catch(() => ({ rows: [{ count: 0 }] }));
    
    const totalSubjects = subjectsQuery.rows[0]?.count || 0;

    return {
      status: totalSubjects > 0 ? "active" : "setup_required",
      totalSubjects,
      coreSubjects: totalSubjects,
      electiveSubjects: 0,
      departments: 0,
      subjectDistribution: [],
      departmentHeads: []
    };
  }

  async getStaffOverview(tenantId: string) {
    const summaryResult = await this.executeSql(
      `
        SELECT
          COUNT(*)::int AS total_staff,
          COUNT(*) FILTER (WHERE status = 'active')::int AS active_staff
        FROM tenant_memberships
        WHERE tenant_id = $1
      `,
      [tenantId],
    ).catch(() => ({ rows: [] }));

    const totalStaff = summaryResult.rows[0]?.total_staff || 0;
    const activeStaff = summaryResult.rows[0]?.active_staff || 0;

    return {
      status: "active",
      totalStaff: activeStaff,
      teachingStaff: activeStaff,
      supportStaff: 0,
      onLeave: 0,
      staffDistribution: [],
      recentOnboarding: []
    };
  }

  async getPrincipalOverview(tenantId: string) {
    const studentCountResult = await this.executeSql(
      `SELECT COUNT(*)::int AS count FROM students WHERE tenant_id = $1 AND status = 'active'`,
      [tenantId]
    ).catch(() => ({ rows: [] }));
    const totalStudents = studentCountResult.rows[0]?.count || 0;

    const staffCountResult = await this.executeSql(
      `SELECT COUNT(*)::int AS count FROM tenant_memberships WHERE tenant_id = $1 AND status = 'active'`,
      [tenantId]
    ).catch(() => ({ rows: [] }));
    const totalStaff = staffCountResult.rows[0]?.count || 0;

    const activeIssuesResult = await this.executeSql(
      `SELECT COUNT(*)::int AS count FROM admin_incidents WHERE tenant_id = $1 AND status IN ('reported', 'escalated')`,
      [tenantId]
    ).catch(() => ({ rows: [] }));
    const activeIssues = activeIssuesResult.rows[0]?.count || 0;

    const pendingApprovalsResult = await this.executeSql(
      `SELECT COUNT(*)::int AS count FROM report_readiness_reviews WHERE tenant_id = $1`,
      [tenantId]
    ).catch(() => ({ rows: [] }));
    const pendingApprovals = pendingApprovalsResult.rows[0]?.count || 0;

    const recentActivityResult = await this.executeSql(
      `SELECT action as label, created_at as time FROM audit_logs WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 5`,
      [tenantId]
    ).catch(() => ({ rows: [] }));
    
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
      recentActivity: recentActivity.length > 0 ? recentActivity : [
        { label: "Welcome to the Principal Dashboard", time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      ]
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
    return {
      status: "active",
      pendingTotal: 0,
      urgentApprovals: 0,
      categories: [],
      recentApprovals: []
    };
  }

  async getPrincipalReportsOverview(tenantId: string) {
    return {
      status: "active",
      availableReports: 0,
      favoriteReports: 0,
      recentlyGenerated: 0,
      categories: [],
      scheduledReports: []
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
      `SELECT count(*)::int as count FROM tenant_memberships WHERE tenant_id = $1 AND role IN ('principal', 'deputy_principal', 'school_admin')`,
      [tenantId]
    ).catch(() => ({ rows: [{ count: 0 }] }));

    const termsComplete = await this.executeSql(
      `SELECT count(*)::int as count FROM academic_terms WHERE tenant_id = $1`,
      [tenantId]
    ).catch(() => ({ rows: [{ count: 0 }] }));

    const gradesComplete = await this.executeSql(
      `SELECT count(*)::int as count FROM academics_grading_systems WHERE tenant_id = $1`,
      [tenantId]
    ).catch(() => ({ rows: [{ count: 0 }] }));

    const subjectsComplete = await this.executeSql(
      `SELECT count(*)::int as count FROM subjects WHERE tenant_id = $1`,
      [tenantId]
    ).catch(() => ({ rows: [{ count: 0 }] }));

    const studentsComplete = await this.executeSql(
      `SELECT count(*)::int as count FROM students WHERE tenant_id = $1 AND status = 'active'`,
      [tenantId]
    ).catch(() => ({ rows: [{ count: 0 }] }));

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
      `SELECT name, ends_on FROM academic_terms WHERE tenant_id = $1 AND ends_on > NOW() ORDER BY starts_on ASC LIMIT 1`,
      [tenantId]
    ).catch(() => ({ rows: [] }));
    
    const activeTermName = termsQuery.rows[0]?.name || "Not Configured";
    let weeksRemaining = 0;
    if (termsQuery.rows[0]?.ends_on) {
      const ms = new Date(termsQuery.rows[0].ends_on).getTime() - Date.now();
      weeksRemaining = Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24 * 7)));
    }

    const gradings = await this.executeSql(
      `SELECT count(*)::int as count FROM academics_grading_systems WHERE tenant_id = $1`,
      [tenantId]
    ).catch(() => ({ rows: [{ count: 0 }] }));

    const subjects = await this.executeSql(
      `SELECT count(*)::int as count FROM subjects WHERE tenant_id = $1`,
      [tenantId]
    ).catch(() => ({ rows: [{ count: 0 }] }));

    const teachers = await this.executeSql(
      `SELECT count(DISTINCT teacher_user_id)::int as count FROM teacher_subject_assignments WHERE tenant_id = $1`,
      [tenantId]
    ).catch(() => ({ rows: [{ count: 0 }] }));

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

  async getPrincipalSettings(tenantId: string) {
    return {
      status: "active",
      notifications: {
        emailAlerts: true,
        smsAlerts: false,
        dailyDigest: true
      },
      dashboard: {
        theme: "system",
        showTeachingWorkspace: true,
        defaultView: "overview"
      },
      security: {
        twoFactorAuth: false,
        lastPasswordChange: "2026-01-15"
      }
    };
  }

  async getPrincipalTeachingSchedule(tenantId: string) {
    const metrics = await this.executeSql(
      `
        SELECT
          COUNT(DISTINCT lesson.stream_id)::int AS total_classes,
          COUNT(*) FILTER (
            WHERE COALESCE((lesson.metadata->>'grading_status'), 'pending') IN ('pending', 'missing', 'due')
          )::int AS pending_grading
        FROM timetable_lessons lesson
        LEFT JOIN class_subject_assignments assignment
          ON assignment.tenant_id = lesson.tenant_id
         AND assignment.id = lesson.class_subject_assignment_id
        LEFT JOIN staff_members staff
          ON staff.tenant_id = assignment.tenant_id
         AND staff.id = assignment.staff_member_id
        WHERE lesson.tenant_id = $1
          AND (
            staff.metadata->>'primary_role' = 'principal'
            OR staff.metadata->>'role' = 'principal'
            OR staff.metadata->>'position' ILIKE '%principal%'
            OR staff.full_name ILIKE '%principal%'
            OR lesson.metadata->>'assigned_role' = 'principal'
          )
      `,
      [tenantId],
    );
    const lessons = await this.executeSql(
      `
        SELECT
          COALESCE(stream.name, section.name, 'Assigned class') AS class_name,
          COALESCE(subject.name, subject.code, 'Assigned subject') AS subject_name,
          CONCAT(lesson.starts_at::text, ' - ', lesson.ends_at::text) AS lesson_time,
          COALESCE(lesson.room_label, lesson.metadata->>'room_label', 'Room not assigned') AS room_name
        FROM timetable_lessons lesson
        LEFT JOIN streams stream
          ON stream.tenant_id = lesson.tenant_id
         AND stream.id = lesson.stream_id
        LEFT JOIN class_sections section
          ON section.tenant_id = lesson.tenant_id
         AND section.id = lesson.stream_id
        LEFT JOIN class_subject_assignments assignment
          ON assignment.tenant_id = lesson.tenant_id
         AND assignment.id = lesson.class_subject_assignment_id
        LEFT JOIN subjects subject
          ON subject.tenant_id = assignment.tenant_id
         AND subject.id = assignment.subject_id
        LEFT JOIN staff_members staff
          ON staff.tenant_id = assignment.tenant_id
         AND staff.id = assignment.staff_member_id
        WHERE lesson.tenant_id = $1
          AND (
            staff.metadata->>'primary_role' = 'principal'
            OR staff.metadata->>'role' = 'principal'
            OR staff.metadata->>'position' ILIKE '%principal%'
            OR staff.full_name ILIKE '%principal%'
            OR lesson.metadata->>'assigned_role' = 'principal'
          )
        ORDER BY
          CASE WHEN lesson.weekday >= EXTRACT(ISODOW FROM CURRENT_DATE)::int THEN 0 ELSE 1 END,
          lesson.weekday ASC,
          lesson.period_number ASC
        LIMIT 10
      `,
      [tenantId],
    );
    const upcomingClasses = lessons.rows.map((row: any) => ({
      class: row.class_name,
      subject: row.subject_name,
      time: row.lesson_time,
      room: row.room_name,
    }));

    return {
      status: upcomingClasses.length ? "active" : "empty",
      totalClasses: metrics.rows[0]?.total_classes ?? 0,
      subjects: Array.from(new Set(upcomingClasses.map((lesson) => lesson.subject).filter(Boolean))),
      upcomingClasses,
      pendingGrading: metrics.rows[0]?.pending_grading ?? 0
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
    ).catch(() => undefined);
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
    fallback: T,
    mapper: (row: Record<string, unknown> | undefined) => T,
  ): Promise<T> {
    try {
      const result = await this.executeSql(sql, values);

      return mapper(result.rows[0] as Record<string, unknown> | undefined);
    } catch (error) {
      const code = typeof error === 'object' && error ? (error as { code?: string }).code : undefined;

      if (code === '42P01' || code === '42703') {
        return fallback;
      }

      throw error;
    }
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

  async createCommunicationBroadcast(data: { tenant_id: string; user_id: string; audience: string; message: string; channels?: string[] }) {
    const normalizedChannels = (data.channels ?? ['in_app']).map((channel) => String(channel).toLowerCase());
    const smsRecipients = await this.executeSql<{ phone: string }>(
      `
        SELECT DISTINCT phone
        FROM (
          SELECT phone FROM student_guardians WHERE tenant_id = $1 AND phone IS NOT NULL AND ($2 IN ('parents', 'guardians', 'all'))
          UNION ALL
          SELECT phone_number AS phone FROM guardians WHERE tenant_id = $1 AND phone_number IS NOT NULL AND ($2 IN ('parents', 'guardians', 'all'))
          UNION ALL
          SELECT phone FROM staff_profiles WHERE tenant_id = $1 AND phone IS NOT NULL AND ($2 IN ('staff', 'teachers', 'all'))
        ) recipients
        WHERE phone IS NOT NULL AND btrim(phone) <> ''
        LIMIT 500
      `,
      [data.tenant_id, data.audience],
    ).catch(() => ({ rows: [], rowCount: 0 }));
    const broadcastStatus = normalizedChannels.includes('sms') ? 'PENDING' : 'SENT';
    const broadcast = await this.executeSql(
      `
        INSERT INTO communication_broadcasts (
          school_id, user_id, audience, message, channels, status
        )
        VALUES ($1, $2::uuid, $3, $4, $5::text[], $6)
        RETURNING *
      `,
      [data.tenant_id, data.user_id, data.audience, data.message, normalizedChannels, broadcastStatus],
    );
    const broadcastId = broadcast.rows[0]?.id;
    const event = await this.executeSql(
      `
        INSERT INTO workflow_events (
          tenant_id, source_user_id, source_role, target_roles, event_type, entity_type, entity_id, title, message, priority, payload
        )
        VALUES ($1, $2::uuid, 'principal', $3::jsonb, 'communication.broadcast_created', 'communication_broadcast', $4, $5, $6, 'normal', $7::jsonb)
        RETURNING *
      `,
      [
        data.tenant_id,
        data.user_id,
        JSON.stringify([data.audience]),
        broadcastId,
        `Broadcast to ${data.audience}`,
        data.message,
        JSON.stringify({ audience: data.audience, channels: normalizedChannels, broadcast_id: broadcastId, source_dashboard: 'principal-command' }),
      ],
    );

    if (normalizedChannels.includes('sms') && smsRecipients.rows.length > 0) {
      await this.executeSql(
        `
          INSERT INTO communication_sms_outbox (message, recipient_phone, sent_by, status, tenant_id, updated_at)
          SELECT $1, phone, $2::uuid, 'Pending', $3, NOW()
          FROM unnest($4::text[]) AS phone
        `,
        [data.message, data.user_id, data.tenant_id, smsRecipients.rows.map((row) => row.phone)],
      );
    }

    await this.executeSql(
      `
        INSERT INTO notifications (
          tenant_id, notification_key, recipient_role, type, title, body, status, metadata
        )
        VALUES ($1, $2, $3, 'communication.broadcast_created', $4, $5, 'unread', $6::jsonb)
        ON CONFLICT (tenant_id, notification_key)
        DO UPDATE SET title = EXCLUDED.title, body = EXCLUDED.body, metadata = EXCLUDED.metadata, updated_at = NOW()
      `,
      [
        data.tenant_id,
        `principal-broadcast-${broadcastId ?? event.rows[0]?.id ?? Date.now()}`,
        data.audience,
        `Broadcast to ${data.audience}`,
        data.message,
        JSON.stringify({ audience: data.audience, channels: normalizedChannels, broadcast_id: broadcastId, sms_recipient_count: smsRecipients.rows.length }),
      ],
    );

    return { broadcast: broadcast.rows[0], event: event.rows[0], smsRecipientCount: smsRecipients.rows.length };
  }

  async logAbsence(data: { tenant_id: string; user_id: string; student_id: string; date: string; is_excused: boolean }) {
    const result = await this.executeSql(
      `
        INSERT INTO attendance_records (
          tenant_id, student_id, attendance_date, status, notes, metadata
        )
        SELECT $1, student.id, $3::date, $4, $5, $6::jsonb
        FROM students student
        WHERE student.tenant_id = $1
          AND student.id = $2::uuid
        RETURNING *
      `,
      [
        data.tenant_id,
        data.student_id,
        data.date,
        data.is_excused ? 'excused_absent' : 'absent',
        data.is_excused ? 'Logged as excused by principal command center' : 'Logged by principal command center',
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
