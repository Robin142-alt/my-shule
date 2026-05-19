import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../../database/database.service';
import type { PrincipalExecutiveDashboard } from '../principal-insights.types';

@Injectable()
export class AdminCommandRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async getPrincipalDashboard(tenantId: string) {
    const result = await this.databaseService.query(
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
              AND attendance_date = CURRENT_DATE
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
              (SELECT COUNT(DISTINCT teacher_user_id)::int FROM teacher_attendance_logs WHERE tenant_id = $1 AND attendance_date = CURRENT_DATE AND status IN ('present', 'late', 'half_day')) AS teacher_present_today,
              (SELECT COUNT(*)::int FROM teacher_attendance_logs WHERE tenant_id = $1 AND attendance_date = CURRENT_DATE AND status = 'late') AS teacher_late_today,
              (SELECT COUNT(*)::int FROM teacher_attendance_logs WHERE tenant_id = $1 AND attendance_date = CURRENT_DATE AND status = 'absent') AS teacher_absent_today,
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
                    AND attendance_date >= CURRENT_DATE - INTERVAL '7 days'
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
    const result = await this.databaseService.query(
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
    const result = await this.databaseService.query(
      `
        SELECT
          (SELECT COUNT(*)::int FROM announcements WHERE tenant_id = $1) AS announcements,
          (SELECT COUNT(*)::int FROM meeting_minutes WHERE tenant_id = $1) AS meetings
      `,
      [tenantId],
    );

    return {
      admissions_queue: [],
      communication_summary: result.rows[0] ?? { announcements: 0, meetings: 0 },
      records_summary: [],
      report_exports: [],
    };
  }

  async findPrincipalDashboardSnapshot(input: {
    tenant_id: string;
    enabled_module_hash: string;
    filter_hash: string;
  }): Promise<PrincipalExecutiveDashboard | null> {
    try {
      const result = await this.databaseService.query(
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
    await this.databaseService.query(
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
    await this.databaseService.query(
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
    const result = await this.databaseService.query(sql, values);

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
      const result = await this.databaseService.query(sql, values);

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
}
