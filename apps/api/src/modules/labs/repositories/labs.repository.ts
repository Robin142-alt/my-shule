import { Injectable, InternalServerErrorException } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class LabsRepository {

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

  createDepartment(input: Record<string, unknown>) {
    return this.insertReturning(
      `
        INSERT INTO lab_departments (tenant_id, name, type, hod_id)
        VALUES ($1, $2, $3, $4::uuid)
        RETURNING *
      `,
      [input.tenant_id, input.name, input.type, input.hod_id ?? null],
    );
  }

  createLab(input: Record<string, unknown>) {
    return this.insertReturning(
      `
        INSERT INTO labs (tenant_id, department_id, name, capacity, location)
        VALUES ($1, $2::uuid, $3, $4, $5)
        RETURNING *
      `,
      [input.tenant_id, input.department_id, input.name, input.capacity, input.location ?? null],
    );
  }

  createLabSession(input: Record<string, unknown>) {
    return this.insertReturning(
      `
        INSERT INTO lab_sessions (
          tenant_id, lab_id, class_section_id, subject_id, subject_name,
          session_date, start_time, end_time, teacher_id, is_mandatory
        )
        VALUES ($1, $2::uuid, $3::uuid, $4::uuid, $5, $6::date, $7::time, $8::time, $9::uuid, $10)
        RETURNING *
      `,
      [
        input.tenant_id,
        input.lab_id,
        input.class_section_id,
        input.subject_id ?? null,
        input.subject,
        input.date,
        input.start_time,
        input.end_time,
        input.teacher_id,
        input.is_mandatory,
      ],
    );
  }

  async markAttendance(input: {
    tenant_id: string;
    session_id: string;
    recorded_by: string;
    attendance: Array<{ student_id: string; status: string }>;
  }) {
    const rows = [];

    for (const attendance of input.attendance) {
      const result = await this.executeSql(
        `
          INSERT INTO lab_attendance (
            tenant_id, session_id, student_id, status, recorded_by
          )
          VALUES ($1, $2::uuid, $3::uuid, $4, $5::uuid)
          ON CONFLICT (tenant_id, session_id, student_id)
          DO UPDATE SET
            status = EXCLUDED.status,
            recorded_by = EXCLUDED.recorded_by,
            recorded_at = NOW(),
            updated_at = NOW()
          RETURNING *
        `,
        [
          input.tenant_id,
          input.session_id,
          attendance.student_id,
          attendance.status,
          input.recorded_by,
        ],
      );
      rows.push(result.rows[0]);
    }

    return rows;
  }

  createEquipment(input: Record<string, unknown>) {
    return this.insertReturning(
      `
        INSERT INTO lab_equipment (
          tenant_id, department_id, lab_id, name, asset_tag, quantity_total,
          quantity_available, condition_status, is_consumable
        )
        VALUES ($1, $2::uuid, $3::uuid, $4, $5, $6, $6, $7, $8)
        RETURNING *
      `,
      [
        input.tenant_id,
        input.department_id,
        input.lab_id,
        input.name,
        input.asset_tag,
        input.quantity_total,
        input.condition_status,
        input.is_consumable,
      ],
    );
  }

  createChemical(input: Record<string, unknown>) {
    return this.insertReturning(
      `
        INSERT INTO chemical_items (
          tenant_id, lab_id, name, chemical_formula, hazard_class, batch_number,
          quantity_total, quantity_available, unit, manufacture_date, expiry_date
        )
        VALUES ($1, $2::uuid, $3, $4, $5, $6, $7, $7, $8, $9::date, $10::date)
        RETURNING *
      `,
      [
        input.tenant_id,
        input.lab_id,
        input.name,
        input.chemical_formula ?? null,
        input.hazard_class,
        input.batch_number,
        input.quantity_total,
        input.unit,
        input.manufacture_date ?? null,
        input.expiry_date,
      ],
    );
  }

  async issueEquipmentToSession(input: Record<string, unknown>) {
    return this.prisma.withRequestTransaction(async () => {
      await this.executeSql(
        `
          UPDATE lab_equipment
          SET quantity_available = quantity_available - $3,
              quantity_in_use = quantity_in_use + $3,
              updated_at = NOW()
          WHERE tenant_id = $1
            AND id = $2::uuid
            AND quantity_available >= $3
        `,
        [input.tenant_id, input.equipment_id, input.quantity_used],
      );

      return this.insertReturning(
        `
          INSERT INTO lab_session_equipment_usage (
            tenant_id, session_id, equipment_id, quantity_used, condition_after_use
          )
          VALUES ($1, $2::uuid, $3::uuid, $4, $5)
          RETURNING *
        `,
        [
          input.tenant_id,
          input.session_id,
          input.equipment_id,
          input.quantity_used,
          input.condition_after_use,
        ],
      );
    });
  }

  reconcileEquipmentUsage(input: Record<string, unknown>) {
    return this.insertReturning(
      `
        UPDATE lab_session_equipment_usage
        SET returned_quantity = $3,
            condition_after_use = $4,
            reconciled_at = NOW(),
            updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
        RETURNING *
      `,
      [
        input.tenant_id,
        input.usage_id,
        input.returned_quantity,
        input.condition_after_use,
      ],
    );
  }

  async findChemicalForIssue(input: { tenant_id: string; chemical_id: string }) {
    const result = await this.executeSql(
      `
        SELECT id::text, status, expiry_date::text, quantity_available::text
        FROM chemical_items
        WHERE tenant_id = $1
          AND id = $2::uuid
        LIMIT 1
      `,
      [input.tenant_id, input.chemical_id],
    );

    return result.rows[0] ?? null;
  }

  async issueChemicalToSession(input: Record<string, unknown>) {
    return this.prisma.withRequestTransaction(async () => {
      await this.executeSql(
        `
          UPDATE chemical_items
          SET quantity_available = quantity_available - $3::numeric,
              updated_at = NOW()
          WHERE tenant_id = $1
            AND id = $2::uuid
            AND quantity_available >= $3::numeric
        `,
        [input.tenant_id, input.chemical_id, input.quantity_used],
      );

      return this.insertReturning(
        `
          INSERT INTO lab_session_chemical_usage (
            tenant_id, session_id, chemical_id, quantity_used, issued_by
          )
          VALUES ($1, $2::uuid, $3::uuid, $4::numeric, $5::uuid)
          RETURNING *
        `,
        [
          input.tenant_id,
          input.session_id,
          input.chemical_id,
          input.quantity_used,
          input.issued_by,
        ],
      );
    });
  }

  requestChemicalDisposal(input: Record<string, unknown>) {
    return this.insertReturning(
      `
        INSERT INTO chemical_disposal_requests (
          tenant_id, chemical_id, requested_by, reason
        )
        VALUES ($1, $2::uuid, $3::uuid, $4)
        RETURNING *
      `,
      [input.tenant_id, input.chemical_id, input.requested_by, input.reason],
    );
  }

  approveChemicalDisposal(input: Record<string, unknown>) {
    return this.insertReturning(
      `
        UPDATE chemical_disposal_requests
        SET status = 'approved',
            approved_by = $3::uuid,
            approved_at = NOW(),
            updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
        RETURNING *
      `,
      [input.tenant_id, input.request_id, input.approved_by],
    );
  }

  async getLabSessionForCompletion(input: { tenant_id: string; session_id: string }) {
    const result = await this.executeSql(
      `
        SELECT id::text, class_section_id::text, is_mandatory
        FROM lab_sessions
        WHERE tenant_id = $1
          AND id = $2::uuid
        LIMIT 1
      `,
      [input.tenant_id, input.session_id],
    );

    return result.rows[0] ?? null;
  }

  async countMissingMandatoryAttendance(input: { tenant_id: string; session_id: string }) {
    const result = await this.executeSql<{ total: string }>(
      `
        SELECT COUNT(*)::text AS total
        FROM student_class_assignments sca
        INNER JOIN lab_sessions ls
          ON ls.tenant_id = sca.tenant_id
         AND ls.class_section_id = sca.class_section_id
        LEFT JOIN lab_attendance la
          ON la.tenant_id = ls.tenant_id
         AND la.session_id = ls.id
         AND la.student_id = sca.student_id
        WHERE ls.tenant_id = $1
          AND ls.id = $2::uuid
          AND sca.status = 'active'
          AND la.id IS NULL
      `,
      [input.tenant_id, input.session_id],
    );

    return Number(result.rows[0]?.total ?? 0);
  }

  async markMissingMandatoryAttendanceAbsent(input: {
    tenant_id: string;
    session_id: string;
    recorded_by: string;
  }) {
    const result = await this.executeSql(
      `
        INSERT INTO lab_attendance (
          tenant_id, session_id, student_id, status, recorded_by
        )
        SELECT
          session.tenant_id,
          session.id,
          assignment.student_id,
          'absent',
          $3::uuid
        FROM lab_sessions session
        INNER JOIN student_class_assignments assignment
          ON assignment.tenant_id = session.tenant_id
         AND assignment.class_section_id = session.class_section_id
         AND assignment.status = 'active'
        LEFT JOIN lab_attendance attendance
          ON attendance.tenant_id = session.tenant_id
         AND attendance.session_id = session.id
         AND attendance.student_id = assignment.student_id
        WHERE session.tenant_id = $1
          AND session.id = $2::uuid
          AND session.is_mandatory = TRUE
          AND attendance.id IS NULL
        ON CONFLICT (tenant_id, session_id, student_id) DO NOTHING
        RETURNING id::text, student_id::text, status
      `,
      [input.tenant_id, input.session_id, input.recorded_by],
    );

    return result.rows;
  }

  async recordMandatoryLabAttendanceEffects(input: {
    tenant_id: string;
    session_id: string;
    actor_user_id: string | null;
  }) {
    const result = await this.executeSql<{
      behavior_events: string;
      participation_metrics: string;
    }>(
      `
        WITH attendance_rows AS (
          SELECT
            attendance.id,
            attendance.tenant_id,
            attendance.student_id,
            attendance.status,
            session.id AS session_id,
            session.class_section_id,
            session.subject_name,
            session.session_date,
            tenant.id AS school_id,
            assignment.academic_year_id,
            term.id AS academic_term_id
          FROM lab_attendance attendance
          INNER JOIN lab_sessions session
            ON session.tenant_id = attendance.tenant_id
           AND session.id = attendance.session_id
          INNER JOIN student_class_assignments assignment
            ON assignment.tenant_id = attendance.tenant_id
           AND assignment.class_section_id = session.class_section_id
           AND assignment.student_id = attendance.student_id
           AND assignment.status = 'active'
          INNER JOIN tenants tenant
            ON tenant.tenant_id = attendance.tenant_id
          LEFT JOIN academic_terms term
            ON term.tenant_id = attendance.tenant_id
           AND term.academic_year_id = assignment.academic_year_id
           AND session.session_date BETWEEN term.starts_on AND term.ends_on
          WHERE attendance.tenant_id = $1
            AND session.id = $2::uuid
            AND session.is_mandatory = TRUE
        ),
        behavior_rows AS (
          INSERT INTO behavior_points (
            tenant_id,
            school_id,
            student_id,
            class_id,
            academic_term_id,
            academic_year_id,
            source_type,
            source_id,
            points_delta,
            reason,
            awarded_by_user_id,
            metadata
          )
          SELECT
            row.tenant_id,
            row.school_id,
            row.student_id,
            row.class_section_id,
            row.academic_term_id,
            row.academic_year_id,
            'lab_attendance',
            row.id,
            CASE row.status
              WHEN 'absent' THEN -2
              WHEN 'late' THEN -1
              ELSE 0
            END,
            CASE row.status
              WHEN 'absent' THEN 'Mandatory lab attendance absence'
              ELSE 'Mandatory lab attendance lateness'
            END,
            $3::uuid,
            jsonb_build_object(
              'severity', 'low',
              'session_id', row.session_id,
              'subject', row.subject_name,
              'session_date', row.session_date,
              'attendance_status', row.status
            )
          FROM attendance_rows row
          WHERE row.status IN ('absent', 'late')
            AND row.academic_term_id IS NOT NULL
            AND NOT EXISTS (
              SELECT 1
              FROM behavior_points point
              WHERE point.tenant_id = row.tenant_id
                AND point.source_type = 'lab_attendance'
                AND point.source_id = row.id
            )
          RETURNING 1
        ),
        metric_rows AS (
          INSERT INTO academic_audit_logs (
            tenant_id, entity_type, entity_id, action, actor_user_id, metadata
          )
          SELECT
            row.tenant_id,
            'lab_attendance',
            row.id,
            'labs.participation_metric_recorded',
            $3::uuid,
            jsonb_build_object(
              'session_id', row.session_id,
              'class_section_id', row.class_section_id,
              'student_id', row.student_id,
              'subject', row.subject_name,
              'session_date', row.session_date,
              'status', row.status,
              'is_mandatory', true
            )
          FROM attendance_rows row
          WHERE NOT EXISTS (
            SELECT 1
            FROM academic_audit_logs audit
            WHERE audit.tenant_id = row.tenant_id
              AND audit.entity_type = 'lab_attendance'
              AND audit.entity_id = row.id
              AND audit.action = 'labs.participation_metric_recorded'
          )
          RETURNING 1
        )
        SELECT
          (SELECT COUNT(*)::text FROM behavior_rows) AS behavior_events,
          (SELECT COUNT(*)::text FROM metric_rows) AS participation_metrics
      `,
      [input.tenant_id, input.session_id, input.actor_user_id],
    );

    return {
      behavior_events: Number(result.rows[0]?.behavior_events ?? 0),
      participation_metrics: Number(result.rows[0]?.participation_metrics ?? 0),
    };
  }

  completeLabSession(input: { tenant_id: string; session_id: string }) {
    return this.insertReturning(
      `
        UPDATE lab_sessions
        SET status = 'completed', updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
        RETURNING *
      `,
      [input.tenant_id, input.session_id],
    );
  }

  async flagMandatoryAttendanceDisciplineGaps(input: { lookback_days: number }) {
    const result = await this.executeSql<{
      auto_absent: string;
      behavior_events: string;
      participation_metrics: string;
    }>(
      `
        WITH completed_sessions AS (
          SELECT
            session.id,
            session.tenant_id,
            session.class_section_id,
            session.subject_name,
            session.session_date,
            session.teacher_id
          FROM lab_sessions session
          WHERE session.is_mandatory = TRUE
            AND session.status = 'completed'
            AND session.session_date >= CURRENT_DATE - ($1::integer * INTERVAL '1 day')
        ),
        auto_absent_rows AS (
          INSERT INTO lab_attendance (
            tenant_id, session_id, student_id, status, recorded_by
          )
          SELECT
            session.tenant_id,
            session.id,
            assignment.student_id,
            'absent',
            session.teacher_id
          FROM completed_sessions session
          INNER JOIN student_class_assignments assignment
            ON assignment.tenant_id = session.tenant_id
           AND assignment.class_section_id = session.class_section_id
           AND assignment.status = 'active'
          LEFT JOIN lab_attendance attendance
            ON attendance.tenant_id = session.tenant_id
           AND attendance.session_id = session.id
           AND attendance.student_id = assignment.student_id
          WHERE attendance.id IS NULL
          ON CONFLICT (tenant_id, session_id, student_id) DO NOTHING
          RETURNING id
        ),
        attendance_rows AS (
          SELECT
            attendance.id,
            attendance.tenant_id,
            attendance.student_id,
            attendance.status,
            session.id AS session_id,
            session.class_section_id,
            session.subject_name,
            session.session_date,
            tenant.id AS school_id,
            assignment.academic_year_id,
            term.id AS academic_term_id
          FROM lab_attendance attendance
          INNER JOIN completed_sessions session
            ON session.tenant_id = attendance.tenant_id
           AND session.id = attendance.session_id
          INNER JOIN student_class_assignments assignment
            ON assignment.tenant_id = attendance.tenant_id
           AND assignment.class_section_id = session.class_section_id
           AND assignment.student_id = attendance.student_id
           AND assignment.status = 'active'
          INNER JOIN tenants tenant
            ON tenant.tenant_id = attendance.tenant_id
          LEFT JOIN academic_terms term
            ON term.tenant_id = attendance.tenant_id
           AND term.academic_year_id = assignment.academic_year_id
           AND session.session_date BETWEEN term.starts_on AND term.ends_on
        ),
        behavior_rows AS (
          INSERT INTO behavior_points (
            tenant_id,
            school_id,
            student_id,
            class_id,
            academic_term_id,
            academic_year_id,
            source_type,
            source_id,
            points_delta,
            reason,
            awarded_by_user_id,
            metadata
          )
          SELECT
            row.tenant_id,
            row.school_id,
            row.student_id,
            row.class_section_id,
            row.academic_term_id,
            row.academic_year_id,
            'lab_attendance',
            row.id,
            CASE row.status
              WHEN 'absent' THEN -2
              WHEN 'late' THEN -1
              ELSE 0
            END,
            CASE row.status
              WHEN 'absent' THEN 'Mandatory lab attendance absence'
              ELSE 'Mandatory lab attendance lateness'
            END,
            NULL::uuid,
            jsonb_build_object(
              'severity', 'low',
              'session_id', row.session_id,
              'subject', row.subject_name,
              'session_date', row.session_date,
              'attendance_status', row.status
            )
          FROM attendance_rows row
          WHERE row.status IN ('absent', 'late')
            AND row.academic_term_id IS NOT NULL
            AND NOT EXISTS (
              SELECT 1
              FROM behavior_points point
              WHERE point.tenant_id = row.tenant_id
                AND point.source_type = 'lab_attendance'
                AND point.source_id = row.id
            )
          RETURNING 1
        ),
        metric_rows AS (
          INSERT INTO academic_audit_logs (
            tenant_id, entity_type, entity_id, action, actor_user_id, metadata
          )
          SELECT
            row.tenant_id,
            'lab_attendance',
            row.id,
            'labs.participation_metric_recorded',
            NULL::uuid,
            jsonb_build_object(
              'session_id', row.session_id,
              'class_section_id', row.class_section_id,
              'student_id', row.student_id,
              'subject', row.subject_name,
              'session_date', row.session_date,
              'status', row.status,
              'is_mandatory', true
            )
          FROM attendance_rows row
          WHERE NOT EXISTS (
            SELECT 1
            FROM academic_audit_logs audit
            WHERE audit.tenant_id = row.tenant_id
              AND audit.entity_type = 'lab_attendance'
              AND audit.entity_id = row.id
              AND audit.action = 'labs.participation_metric_recorded'
          )
          RETURNING 1
        )
        SELECT
          (SELECT COUNT(*)::text FROM auto_absent_rows) AS auto_absent,
          (SELECT COUNT(*)::text FROM behavior_rows) AS behavior_events,
          (SELECT COUNT(*)::text FROM metric_rows) AS participation_metrics
      `,
      [input.lookback_days],
    );

    return {
      auto_absent: Number(result.rows[0]?.auto_absent ?? 0),
      behavior_events: Number(result.rows[0]?.behavior_events ?? 0),
      participation_metrics: Number(result.rows[0]?.participation_metrics ?? 0),
    };
  }

  async refreshChemicalExpiryStatuses(input: { near_expiry_days: number }) {
    const result = await this.executeSql<{
      expired: string;
      near_expiry: string;
    }>(
      `
        WITH expired AS (
          UPDATE chemical_items
          SET status = 'expired',
              updated_at = NOW()
          WHERE status NOT IN ('expired', 'quarantined', 'disposed')
            AND expiry_date < CURRENT_DATE
          RETURNING id
        ),
        near_expiry AS (
          UPDATE chemical_items
          SET status = 'near_expiry',
              updated_at = NOW()
          WHERE status = 'active'
            AND expiry_date >= CURRENT_DATE
            AND expiry_date <= CURRENT_DATE + ($1::integer * INTERVAL '1 day')
          RETURNING id
        )
        SELECT
          (SELECT COUNT(*)::text FROM expired) AS expired,
          (SELECT COUNT(*)::text FROM near_expiry) AS near_expiry
      `,
      [input.near_expiry_days],
    );

    return {
      expired: Number(result.rows[0]?.expired ?? 0),
      near_expiry: Number(result.rows[0]?.near_expiry ?? 0),
    };
  }

  async flagOverdueEquipmentUsage(input: { overdue_hours: number }) {
    const result = await this.executeSql<{ unreconciled: string }>(
      `
        WITH overdue_usage AS (
          SELECT
            usage.id,
            usage.tenant_id,
            usage.session_id,
            usage.equipment_id,
            usage.quantity_used,
            usage.returned_quantity
          FROM lab_session_equipment_usage usage
          INNER JOIN lab_sessions session
            ON session.tenant_id = usage.tenant_id
           AND session.id = usage.session_id
          WHERE usage.reconciled_at IS NULL
            AND usage.returned_quantity < usage.quantity_used
            AND session.status <> 'cancelled'
            AND (session.session_date + session.end_time + ($1::integer * INTERVAL '1 hour')) < NOW()
        ),
        audit_rows AS (
          INSERT INTO academic_audit_logs (
            tenant_id, entity_type, entity_id, action, actor_user_id, metadata
          )
          SELECT
            tenant_id,
            'lab_session_equipment_usage',
            id,
            'labs.equipment_reconciliation_overdue',
            NULL,
            jsonb_build_object(
              'session_id', session_id,
              'equipment_id', equipment_id,
              'quantity_used', quantity_used,
              'returned_quantity', returned_quantity,
              'overdue_hours', $1::integer
            )
          FROM overdue_usage
          RETURNING 1
        )
        SELECT COUNT(*)::text AS unreconciled
        FROM overdue_usage
      `,
      [input.overdue_hours],
    );

    return {
      unreconciled: Number(result.rows[0]?.unreconciled ?? 0),
    };
  }

  async appendAuditLog(input: Record<string, unknown>) {
    await this.executeSql(
      `
        INSERT INTO academic_audit_logs (
          tenant_id, entity_type, entity_id, action, actor_user_id, metadata
        )
        VALUES ($1, $2, $3::uuid, $4, $5::uuid, $6::jsonb)
      `,
      [
        input.tenant_id,
        input.entity_type,
        input.entity_id ?? null,
        input.action,
        input.actor_user_id ?? null,
        JSON.stringify(input.metadata ?? {}),
      ],
    ).catch(() => undefined);
  }

  private async insertReturning(sql: string, values: unknown[]) {
    const result = await this.executeSql(sql, values);

    return result.rows[0];
  }

  async getDashboard(tenantId: string) {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const todaySessionsRes = await this.executeSql(
        `SELECT COUNT(*)::int as count FROM lab_sessions WHERE tenant_id = $1::uuid AND session_date = $2::date`,
        [tenantId, todayStr]
      );
      const todaysSessionsCount = Number(todaySessionsRes.rows[0]?.count ?? 0);

      const pendingRes = await this.executeSql(
        `SELECT COUNT(*)::int as count FROM lab_sessions WHERE tenant_id = $1::uuid AND (status = 'PENDING' OR status = 'SCHEDULED')`,
        [tenantId]
      );
      const pendingRequestsCount = Number(pendingRes.rows[0]?.count ?? 0);

      const lowStockRes = await this.executeSql(
        `SELECT COUNT(*)::int as count FROM chemical_items WHERE tenant_id = $1::uuid AND (quantity_available <= 5 OR expiry_date <= NOW() + INTERVAL '30 days')`,
        [tenantId]
      );
      const lowStockOrExpiringCount = Number(lowStockRes.rows[0]?.count ?? 0);

      const unreturnedRes = await this.executeSql(
        `SELECT COUNT(*)::int as count FROM lab_session_equipment_usage WHERE tenant_id = $1::uuid`,
        [tenantId]
      );
      const unreturnedItemsCount = Number(unreturnedRes.rows[0]?.count ?? 0);

      const breakagesRes = await this.executeSql(
        `SELECT COUNT(*)::int as count FROM lab_session_equipment_usage WHERE tenant_id = $1::uuid AND condition_after_use = 'BROKEN'`,
        [tenantId]
      );
      const activeBreakagesCount = Number(breakagesRes.rows[0]?.count ?? 0);

      const lowStockChemRes = await this.executeSql(
        `SELECT COUNT(*)::int as count FROM chemical_items WHERE tenant_id = $1::uuid AND quantity_available <= 5`,
        [tenantId]
      );
      const lowStockChemicalsCount = Number(lowStockChemRes.rows[0]?.count ?? 0);

      return {
        kpis: [
          { label: "Today's Practicals", value: String(todaysSessionsCount) },
          { label: "Pending Requests", value: String(pendingRequestsCount) },
          { label: "Low Stock / Expiring", value: String(lowStockOrExpiringCount) },
          { label: "Unreturned Items", value: String(unreturnedItemsCount) }
        ],
        todaysSessions: todaysSessionsCount,
        pendingRequests: pendingRequestsCount,
        lowStockExpiring: lowStockOrExpiringCount,
        unreturnedItems: unreturnedItemsCount,
        activeBreakages: activeBreakagesCount,
        lowStockChemicals: lowStockChemicalsCount
      };
    } catch (e: any) {
      console.error('getDashboard error:', e);
      throw new InternalServerErrorException(e.message || 'Database error occurred');
    }
  }

  async getInventory(tenantId: string) {
    try {
      const equipment = await this.executeSql(
        `SELECT id, name, quantity_available, is_consumable FROM lab_equipment WHERE tenant_id = $1::uuid`,
        [tenantId]
      );
      const chemicals = await this.executeSql(
        `SELECT id, name, quantity_available, unit, hazard_class FROM chemical_items WHERE tenant_id = $1::uuid`,
        [tenantId]
      );

      const list: any[] = [];
      for (const eq of equipment.rows) {
        list.push({
          id: eq.id,
          item: eq.name,
          category: eq.is_consumable ? 'Chemical' : 'Apparatus',
          quantity: Number(eq.quantity_available),
          unit: 'Pcs',
          location: 'Lab',
          status: eq.quantity_available <= 5 ? 'Low Stock' : 'OK',
          hazard: 'Low'
        });
      }
      for (const chem of chemicals.rows) {
        list.push({
          id: chem.id,
          item: chem.name,
          category: 'Chemical',
          quantity: Number(chem.quantity_available),
          unit: chem.unit || 'L',
          location: 'Chemical Store',
          status: chem.quantity_available <= 2 ? 'Low Stock' : 'OK',
          hazard: chem.hazard_class || 'Medium'
        });
      }
      return list;
    } catch (e: any) {
      console.error('getInventory error:', e);
      throw new InternalServerErrorException(e.message || 'Database error occurred');
    }
  }

  async getRequests(tenantId: string) {
    try {
      const sessions = await this.executeSql(
        `SELECT s.id, s.subject_name, s.session_date, s.start_time, s.end_time, s.teacher_id, s.class_section_id, s.is_mandatory
         FROM lab_sessions s
         WHERE s.tenant_id = $1::uuid`,
        [tenantId]
      );

      const teacherIds = [...new Set(sessions.rows.map(s => s.teacher_id).filter(Boolean))];
      const classIds = [...new Set(sessions.rows.map(s => s.class_section_id).filter(Boolean))];

      let teachersMap: Record<string, string> = {};
      let classesMap: Record<string, string> = {};

      if (teacherIds.length > 0) {
        const teachers = await this.executeSql(
          `SELECT id, "firstName", "lastName" FROM users WHERE id = ANY($1::uuid[])`,
          [teacherIds]
        );
        for (const t of teachers.rows) {
          teachersMap[t.id] = `${t.firstName} ${t.lastName}`;
        }
      }

      if (classIds.length > 0) {
        const classes = await this.executeSql(
          `SELECT id, name FROM classes WHERE id = ANY($1::uuid[])`,
          [classIds]
        );
        for (const c of classes.rows) {
          classesMap[c.id] = c.name;
        }
      }

      return sessions.rows.map(s => ({
        id: s.id,
        teacher: teachersMap[s.teacher_id] || 'Unknown Teacher',
        className: classesMap[s.class_section_id] || 'Unknown Class',
        subject: s.subject_name || 'Science',
        practical: `${s.subject_name || 'Lab'} Session`,
        requestedFor: `${s.session_date} ${s.start_time}`,
        status: s.is_mandatory ? 'Requested' : 'Prepared',
        teacherAlerted: false
      }));
    } catch (e: any) {
      console.error('getRequests error:', e);
      throw new InternalServerErrorException(e.message || 'Database error occurred');
    }
  }

  async getIssues(tenantId: string) {
    try {
      const eqUsages = await this.executeSql(
        `SELECT u.id, u.equipment_id, u.quantity_used, u.condition_after_use, u.session_id
         FROM lab_session_equipment_usage u
         WHERE u.tenant_id = $1::uuid`,
        [tenantId]
      );

      const chemUsages = await this.executeSql(
        `SELECT u.id, u.chemical_id, u.quantity_used, u.session_id
         FROM lab_session_chemical_usage u
         WHERE u.tenant_id = $1::uuid`,
        [tenantId]
      );

      const sessionIds = [
        ...new Set([
          ...eqUsages.rows.map(u => u.session_id),
          ...chemUsages.rows.map(u => u.session_id)
        ].filter(Boolean))
      ];

      let sessionsMap: Record<string, { teacher: string; className: string }> = {};
      if (sessionIds.length > 0) {
        const sessions = await this.executeSql(
          `SELECT s.id, s.teacher_id, s.class_section_id FROM lab_sessions s WHERE s.id = ANY($1::uuid[])`,
          [sessionIds]
        );
        const teacherIds = [...new Set(sessions.rows.map(s => s.teacher_id).filter(Boolean))];
        const classIds = [...new Set(sessions.rows.map(s => s.class_section_id).filter(Boolean))];

        let teachersMap: Record<string, string> = {};
        let classesMap: Record<string, string> = {};

        if (teacherIds.length > 0) {
          const teachers = await this.executeSql(
            `SELECT id, "firstName", "lastName" FROM users WHERE id = ANY($1::uuid[])`,
            [teacherIds]
          );
          for (const t of teachers.rows) {
            teachersMap[t.id] = `${t.firstName} ${t.lastName}`;
          }
        }
        if (classIds.length > 0) {
          const classes = await this.executeSql(
            `SELECT id, name FROM classes WHERE id = ANY($1::uuid[])`,
            [classIds]
          );
          for (const c of classes.rows) {
            classesMap[c.id] = c.name;
          }
        }

        for (const s of sessions.rows) {
          sessionsMap[s.id] = {
            teacher: teachersMap[s.teacher_id] || 'Unknown Teacher',
            className: classesMap[s.class_section_id] || 'Unknown Class'
          };
        }
      }

      const eqIds = [...new Set(eqUsages.rows.map(u => u.equipment_id).filter(Boolean))];
      const chemIds = [...new Set(chemUsages.rows.map(u => u.chemical_id).filter(Boolean))];

      let eqMap: Record<string, string> = {};
      let chemMap: Record<string, string> = {};

      if (eqIds.length > 0) {
        const equipments = await this.executeSql(
          `SELECT id, name FROM lab_equipment WHERE id = ANY($1::uuid[])`,
          [eqIds]
        );
        for (const e of equipments.rows) {
          eqMap[e.id] = e.name;
        }
      }

      if (chemIds.length > 0) {
        const chemicals = await this.executeSql(
          `SELECT id, name FROM chemical_items WHERE id = ANY($1::uuid[])`,
          [chemIds]
        );
        for (const c of chemicals.rows) {
          chemMap[c.id] = c.name;
        }
      }

      const list: any[] = [];
      for (const eq of eqUsages.rows) {
        const sInfo = sessionsMap[eq.session_id] || { teacher: 'Unknown Teacher', className: 'Unknown Class' };
        list.push({
          id: eq.id,
          item: eqMap[eq.equipment_id] || 'Lab Equipment',
          teacher: sInfo.teacher,
          className: sInfo.className,
          quantity: Number(eq.quantity_used),
          status: eq.condition_after_use === 'BROKEN' ? 'Broken' : 'Issued',
          note: `Condition after use: ${eq.condition_after_use || 'OK'}`
        });
      }

      for (const chem of chemUsages.rows) {
        const sInfo = sessionsMap[chem.session_id] || { teacher: 'Unknown Teacher', className: 'Unknown Class' };
        list.push({
          id: chem.id,
          item: chemMap[chem.chemical_id] || 'Chemical Item',
          teacher: sInfo.teacher,
          className: sInfo.className,
          quantity: Number(chem.quantity_used),
          status: 'Issued',
          note: 'Chemical dispensed'
        });
      }

      return list;
    } catch (e: any) {
      console.error('getIssues error:', e);
      throw new InternalServerErrorException(e.message || 'Database error occurred');
    }
  }
}
