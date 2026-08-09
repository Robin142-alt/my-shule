import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class LabsRepository {
  private readonly transactionContext = new AsyncLocalStorage<{
    $executeRawUnsafe: (query: string, ...params: unknown[]) => Promise<number>;
    $queryRawUnsafe: <T = unknown[]>(query: string, ...params: unknown[]) => Promise<T>;
  }>();

  private async executeSql<T = any>(query: string, params: any[] = []): Promise<{ rows: T[], rowCount: number }> {
    const transaction = this.transactionContext.getStore();
    if (transaction) {
      const returnsRows = /^(SELECT|WITH|SHOW|EXPLAIN|VALUES)\b/i.test(query.trim()) || /\bRETURNING\b/i.test(query);
      if (!returnsRows) {
        const rowCount = await transaction.$executeRawUnsafe(query, ...params);
        return { rows: [], rowCount };
      }
      const result = await transaction.$queryRawUnsafe<T[]>(query, ...params);
      const rows = Array.isArray(result) ? result : [result];
      return { rows, rowCount: rows.length };
    }

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

  private async withRequestTransaction<T>(callback: () => Promise<T>): Promise<T> {
    if (this.transactionContext.getStore()) return callback();
    return this.prisma.withRequestTransaction(async (transaction: any) =>
      this.transactionContext.run(transaction, callback));
  }

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
          quantity_available, condition_status, is_consumable, item_type, category,
          unit, minimum_stock_level, storage_location_id, storage_location,
          tracking_method, serial_number, model, notes, submission_id
        )
        VALUES (
          $1, $2::uuid, $3::uuid, $4, $5, $6, $6, $7, $8, $9, $10,
          $11, $12, $13::uuid, $14, $15, $16, $17, $18, $19
        )
        RETURNING *
      `,
      [
        input.tenant_id,
        input.department_id ?? null,
        input.lab_id ?? null,
        input.name,
        input.asset_tag ?? null,
        input.quantity_total,
        input.condition_status,
        input.is_consumable,
        input.item_type ?? (input.is_consumable ? 'consumable' : 'apparatus'),
        input.category ?? (input.is_consumable ? 'Consumable' : 'Apparatus or Equipment'),
        input.unit ?? 'Pieces',
        input.minimum_stock_level ?? 0,
        input.storage_location_id ?? null,
        input.storage_location ?? null,
        input.tracking_method ?? 'quantity',
        input.serial_number ?? null,
        input.model ?? null,
        input.notes ?? null,
        input.submission_id ?? null,
      ],
    );
  }

  createChemical(input: Record<string, unknown>) {
    return this.insertReturning(
      `
        INSERT INTO chemical_items (
          tenant_id, lab_id, name, chemical_formula, hazard_class, batch_number,
          quantity_total, quantity_available, unit, manufacture_date, expiry_date,
          category, minimum_stock_level, storage_location_id, storage_location,
          concentration, safety_classification, notes, submission_id
        )
        VALUES (
          $1, $2::uuid, $3, $4, $5, $6, $7, $7, $8, $9::date, $10::date,
          $11, $12, $13::uuid, $14, $15, $16, $17, $18
        )
        RETURNING *
      `,
      [
        input.tenant_id,
        input.lab_id ?? null,
        input.name,
        input.chemical_formula ?? null,
        input.hazard_class ?? null,
        input.batch_number ?? null,
        input.quantity_total,
        input.unit,
        input.manufacture_date ?? null,
        input.expiry_date ?? null,
        input.category ?? 'Chemical or Reagent',
        input.minimum_stock_level ?? 0,
        input.storage_location_id ?? null,
        input.storage_location ?? null,
        input.concentration ?? null,
        input.safety_classification ?? input.hazard_class ?? null,
        input.notes ?? null,
        input.submission_id ?? null,
      ],
    );
  }

  async issueEquipmentToSession(input: Record<string, unknown>) {
    return this.withRequestTransaction(async () => {
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
    return this.withRequestTransaction(async () => {
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
    );
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
        teacher: teachersMap[s.teacher_id] || 'Teacher not linked',
        className: classesMap[s.class_section_id] || 'Class not linked',
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
            teacher: teachersMap[s.teacher_id] || 'Teacher not linked',
            className: classesMap[s.class_section_id] || 'Class not linked'
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
        const sInfo = sessionsMap[eq.session_id] || { teacher: 'Teacher not linked', className: 'Class not linked' };
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
        const sInfo = sessionsMap[chem.session_id] || { teacher: 'Teacher not linked', className: 'Class not linked' };
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

  async findLaboratoryItemBySubmission(tenantId: string, submissionId: string) {
    const result = await this.executeSql(
      `
        SELECT id::text, 'equipment' AS item_source, name AS item_name,
               quantity_available::text AS quantity_available, unit, storage_location
        FROM lab_equipment
        WHERE tenant_id = $1 AND submission_id = $2
        UNION ALL
        SELECT id::text, 'chemical' AS item_source, name AS item_name,
               quantity_available::text AS quantity_available, unit, storage_location
        FROM chemical_items
        WHERE tenant_id = $1 AND submission_id = $2
        LIMIT 1
      `,
      [tenantId, submissionId],
    );
    return result.rows[0] ?? null;
  }

  async findPotentialLaboratoryDuplicates(
    tenantId: string,
    normalizedName: string,
    storageLocation?: string | null,
  ) {
    const result = await this.executeSql(
      `
        WITH items AS (
          SELECT id, 'equipment'::text AS item_source, name, item_type, category,
                 quantity_available, unit, storage_location,
                 regexp_replace(regexp_replace(lower(name), '[^a-z0-9]+', '', 'g'), '(es|s)$', '') AS normalized_name
          FROM lab_equipment
          WHERE tenant_id = $1
          UNION ALL
          SELECT id, 'chemical'::text AS item_source, name, 'chemical'::text AS item_type,
                 category, quantity_available, unit, storage_location,
                 regexp_replace(regexp_replace(lower(name), '[^a-z0-9]+', '', 'g'), '(es|s)$', '') AS normalized_name
          FROM chemical_items
          WHERE tenant_id = $1
        )
        SELECT id::text, item_source, name AS item_name, item_type, category,
               quantity_available::text, unit, storage_location
        FROM items
        WHERE normalized_name = $2
           OR normalized_name LIKE '%' || $2 || '%'
           OR $2 LIKE '%' || normalized_name || '%'
        ORDER BY
          CASE WHEN lower(COALESCE(storage_location, '')) = lower(COALESCE($3, '')) THEN 0 ELSE 1 END,
          name
        LIMIT 5
      `,
      [tenantId, normalizedName, storageLocation ?? null],
    );
    return result.rows;
  }

  async createLaboratoryInventoryItem(input: Record<string, unknown>) {
    const existing = input.submission_id
      ? await this.findLaboratoryItemBySubmission(String(input.tenant_id), String(input.submission_id))
      : null;
    if (existing) {
      return { ...existing, idempotent_replay: true };
    }

    return this.withRequestTransaction(async () => {
      const item = input.item_source === 'chemical'
        ? await this.createChemical(input)
        : await this.createEquipment(input);
      if (!item) {
        throw new InternalServerErrorException('The laboratory item could not be created');
      }

      await this.recordLabStockMovement({
        tenant_id: input.tenant_id,
        item_id: item.id,
        item_source: input.item_source,
        item_name: input.name,
        movement_type: 'item_created',
        quantity: input.quantity_total,
        quantity_before: 0,
        quantity_after: input.quantity_total,
        unit: input.unit,
        reason: 'Initial laboratory stock entry',
        submission_id: `${String(input.submission_id)}:created`,
        recorded_by: input.recorded_by,
      });
      return {
        ...item,
        item_source: input.item_source,
        item_name: item.name,
        idempotent_replay: false,
      };
    });
  }

  async getLaboratoryItem(tenantId: string, itemSource: string, itemId: string) {
    const table = itemSource === 'chemical' ? 'chemical_items' : 'lab_equipment';
    const result = await this.executeSql(
      `
        SELECT id::text, name AS item_name, quantity_available::text,
               quantity_total::text, unit, storage_location
        FROM ${table}
        WHERE tenant_id = $1 AND id = $2::uuid
        LIMIT 1
      `,
      [tenantId, itemId],
    );
    return result.rows[0] ?? null;
  }

  async addLaboratoryStock(input: Record<string, unknown>) {
    const tenantId = String(input.tenant_id);
    const submissionId = String(input.submission_id);
    const existingMovement = await this.executeSql(
      `SELECT id::text FROM lab_stock_movements WHERE tenant_id = $1 AND submission_id = $2 LIMIT 1`,
      [tenantId, submissionId],
    );
    if (existingMovement.rows[0]) {
      const existingItem = await this.getLaboratoryItem(
        tenantId,
        String(input.item_source),
        String(input.item_id),
      );
      return { ...existingItem, idempotent_replay: true };
    }

    return this.withRequestTransaction(async () => {
      const itemSource = String(input.item_source);
      const quantity = Number(input.quantity_added);
      const table = itemSource === 'chemical' ? 'chemical_items' : 'lab_equipment';
      const update = await this.executeSql(
        `
          UPDATE ${table}
          SET quantity_total = quantity_total + $3::numeric,
              quantity_available = quantity_available + $3::numeric,
              updated_at = NOW()
          WHERE tenant_id = $1 AND id = $2::uuid
          RETURNING id::text, name AS item_name, unit, storage_location,
                    (quantity_available - $3::numeric)::text AS quantity_before,
                    quantity_available::text AS quantity_available
        `,
        [tenantId, input.item_id, quantity],
      );
      const item = update.rows[0];
      if (!item) {
        throw new NotFoundException('Laboratory item was not found in this school');
      }
      await this.recordLabStockMovement({
        tenant_id: tenantId,
        item_id: input.item_id,
        item_source: itemSource,
        item_name: item.item_name,
        movement_type: 'stock_added',
        quantity,
        quantity_before: item.quantity_before,
        quantity_after: item.quantity_available,
        unit: item.unit,
        reason: input.notes ?? 'Stock added',
        submission_id: submissionId,
        recorded_by: input.recorded_by,
      });
      return { ...item, idempotent_replay: false };
    });
  }

  async recordLabStockMovement(input: Record<string, unknown>) {
    return this.insertReturning(
      `
        INSERT INTO lab_stock_movements (
          tenant_id, item_id, item_source, item_name, movement_type, quantity,
          quantity_before, quantity_after, unit, practical_request_id, issue_id,
          stocktake_id, reason, submission_id, recorded_by
        ) VALUES (
          $1, $2::uuid, $3, $4, $5, $6::numeric, $7::numeric, $8::numeric,
          $9, $10::uuid, $11::uuid, $12::uuid, $13, $14, $15::uuid
        )
        ON CONFLICT (tenant_id, submission_id) WHERE submission_id IS NOT NULL DO NOTHING
        RETURNING *
      `,
      [
        input.tenant_id,
        input.item_id,
        input.item_source,
        input.item_name,
        input.movement_type,
        input.quantity,
        input.quantity_before,
        input.quantity_after,
        input.unit,
        input.practical_request_id ?? null,
        input.issue_id ?? null,
        input.stocktake_id ?? null,
        input.reason ?? null,
        input.submission_id ?? null,
        input.recorded_by ?? null,
      ],
    );
  }

  async listLaboratoryInventory(tenantId: string) {
    const [items, locations] = await Promise.all([
      this.executeSql(
        `
          SELECT * FROM (
            SELECT e.id::text, 'equipment'::text AS item_source, e.name AS item_name,
                   e.item_type, e.category, e.quantity_available::text,
                   e.quantity_total::text, e.minimum_stock_level::text, e.unit,
                   e.storage_location, e.storage_location_id::text, e.tracking_method,
                   e.condition_status AS condition, e.serial_number, e.model,
                   NULL::text AS concentration, NULL::text AS expiry_date,
                   NULL::text AS safety_classification,
                   CASE
                     WHEN e.quantity_available <= 0 THEN 'Out of Stock'
                     WHEN e.quantity_missing > 0 THEN 'Missing'
                     WHEN e.quantity_damaged > 0 THEN 'Damaged'
                     WHEN e.quantity_under_maintenance > 0 THEN 'Under Maintenance'
                     WHEN e.quantity_in_use > 0 THEN 'In Use'
                     WHEN e.quantity_available <= e.minimum_stock_level THEN 'Low Stock'
                     ELSE 'Available'
                   END AS status,
                   e.updated_at::text
            FROM lab_equipment e
            WHERE e.tenant_id = $1
            UNION ALL
            SELECT c.id::text, 'chemical'::text AS item_source, c.name AS item_name,
                   'chemical'::text AS item_type, c.category, c.quantity_available::text,
                   c.quantity_total::text, c.minimum_stock_level::text, c.unit,
                   c.storage_location, c.storage_location_id::text, 'quantity'::text AS tracking_method,
                   NULL::text AS condition, NULL::text AS serial_number, NULL::text AS model,
                   c.concentration, c.expiry_date::text,
                   COALESCE(c.safety_classification, c.hazard_class) AS safety_classification,
                   CASE
                     WHEN c.expiry_date IS NOT NULL AND c.expiry_date < CURRENT_DATE THEN 'Expired'
                     WHEN c.quantity_available <= 0 THEN 'Out of Stock'
                     WHEN c.quantity_available <= c.minimum_stock_level THEN 'Low Stock'
                     ELSE 'Available'
                   END AS status,
                   c.updated_at::text
            FROM chemical_items c
            WHERE c.tenant_id = $1
          ) inventory
          ORDER BY lower(item_name), storage_location NULLS LAST
        `,
        [tenantId],
      ),
      this.listStorageLocations(tenantId),
    ]);
    return { items: items.rows, locations };
  }

  async createStorageLocation(input: Record<string, unknown>) {
    return this.insertReturning(
      `
        INSERT INTO lab_storage_locations (
          tenant_id, laboratory_or_store, room_or_section, cupboard_or_cabinet,
          shelf, full_path, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7::uuid)
        ON CONFLICT (tenant_id, full_path)
        DO UPDATE SET is_active = TRUE, updated_at = NOW()
        RETURNING id::text, laboratory_or_store, room_or_section, cupboard_or_cabinet,
                  shelf, full_path, is_active
      `,
      [
        input.tenant_id,
        input.laboratory_or_store,
        input.room_or_section ?? null,
        input.cupboard_or_cabinet ?? null,
        input.shelf ?? null,
        input.full_path,
        input.created_by ?? null,
      ],
    );
  }

  async listStorageLocations(tenantId: string) {
    const result = await this.executeSql(
      `
        SELECT id::text, laboratory_or_store, room_or_section, cupboard_or_cabinet,
               shelf, full_path, is_active
        FROM lab_storage_locations
        WHERE tenant_id = $1 AND is_active = TRUE
        ORDER BY lower(full_path)
      `,
      [tenantId],
    );
    return result.rows;
  }

  async getSchoolUserDisplayName(tenantId: string, userId: string) {
    const result = await this.executeSql(
      `
        SELECT COALESCE(
                 NULLIF(users.display_name, ''),
                 NULLIF(users.full_name, ''),
                 users.email::text
               ) AS display_name
        FROM users
        INNER JOIN tenant_memberships membership
          ON membership.user_id = users.id
         AND membership.tenant_id = $1
         AND membership.status = 'active'
        WHERE users.id = $2::uuid
        LIMIT 1
      `,
      [tenantId, userId],
    );
    return result.rows[0]?.display_name ? String(result.rows[0].display_name) : null;
  }

  async createPracticalRequest(input: Record<string, any>) {
    const existing = input.submission_id
      ? await this.executeSql(
          `SELECT id::text FROM lab_practical_requests WHERE tenant_id = $1 AND submission_id = $2 LIMIT 1`,
          [input.tenant_id, input.submission_id],
        )
      : { rows: [] as any[] };
    if (existing.rows[0]) {
      return this.getPracticalRequest(String(input.tenant_id), existing.rows[0].id, String(input.actor_role ?? ''));
    }

    return this.withRequestTransaction(async () => {
      const request = await this.insertReturning(
        `
          INSERT INTO lab_practical_requests (
            tenant_id, subject, class_name, practical_date, lesson_time,
            practical_title, teacher_id, teacher_name, learner_groups, teacher_notes,
            is_assessment, confidential_notes, authorized_roles, submission_id,
            created_by, updated_by
          ) VALUES (
            $1, $2, $3, $4::date, $5::time, $6, $7::uuid, $8, $9, $10,
            $11, $12, $13::text[], $14, $15::uuid, $15::uuid
          )
          RETURNING *
        `,
        [
          input.tenant_id,
          input.subject,
          input.class_name,
          input.practical_date,
          input.lesson_time,
          input.practical_title,
          input.teacher_id ?? null,
          input.teacher_name,
          input.learner_groups ?? null,
          input.teacher_notes ?? null,
          input.is_assessment ?? false,
          input.confidential_notes ?? null,
          input.authorized_roles ?? [],
          input.submission_id ?? null,
          input.created_by ?? null,
        ],
      );
      if (!request) {
        throw new InternalServerErrorException('The practical request could not be saved');
      }
      for (const item of input.items ?? []) {
        const available = item.item_id && item.item_source
          ? await this.getLaboratoryItem(String(input.tenant_id), item.item_source, item.item_id)
          : null;
        await this.executeSql(
          `
            INSERT INTO lab_practical_request_items (
              tenant_id, request_id, item_id, item_source, item_name, unit,
              requested_quantity, available_quantity_snapshot, is_returnable, note
            ) VALUES ($1, $2::uuid, $3::uuid, $4, $5, $6, $7::numeric, $8::numeric, $9, $10)
          `,
          [
            input.tenant_id,
            request.id,
            item.item_id ?? null,
            item.item_source ?? null,
            item.item_name,
            item.unit,
            item.requested_quantity,
            available?.quantity_available ?? null,
            item.is_returnable ?? item.item_source !== 'chemical',
            item.notes ?? null,
          ],
        );
      }
      return this.getPracticalRequest(String(input.tenant_id), request.id, String(input.actor_role ?? ''));
    });
  }

  async getPracticalRequests(tenantId: string, actorRole = '') {
    const result = await this.executeSql(
      `
        SELECT r.id::text, r.subject, r.class_name, r.practical_date::text,
               to_char(r.lesson_time, 'HH24:MI') AS lesson_time, r.practical_title,
               r.teacher_id::text, r.teacher_name, r.learner_groups, r.teacher_notes,
               r.preparation_note, r.status, r.is_assessment, r.rejection_reason,
               CASE
                 WHEN r.is_assessment = FALSE OR upper($2) = ANY(r.authorized_roles)
                 THEN r.confidential_notes
                 ELSE NULL
               END AS confidential_notes,
               COALESCE(jsonb_agg(
                 jsonb_build_object(
                   'id', i.id::text,
                   'item_id', i.item_id::text,
                   'item_source', i.item_source,
                   'item_name', i.item_name,
                   'unit', i.unit,
                   'requested_quantity', i.requested_quantity,
                   'approved_quantity', i.approved_quantity,
                   'prepared_quantity', i.prepared_quantity,
                   'available_quantity', COALESCE(
                     CASE WHEN i.item_source = 'equipment' THEN e.quantity_available ELSE c.quantity_available END,
                     i.available_quantity_snapshot,
                     0
                   ),
                   'is_returnable', i.is_returnable,
                   'substitute_item_id', i.substitute_item_id::text,
                   'substitute_item_name', i.substitute_item_name,
                   'status', i.status,
                   'note', i.note
                 ) ORDER BY i.created_at
               ) FILTER (WHERE i.id IS NOT NULL), '[]'::jsonb) AS items
        FROM lab_practical_requests r
        LEFT JOIN lab_practical_request_items i
          ON i.tenant_id = r.tenant_id AND i.request_id = r.id
        LEFT JOIN lab_equipment e
          ON i.item_source = 'equipment' AND e.tenant_id = i.tenant_id AND e.id = i.item_id
        LEFT JOIN chemical_items c
          ON i.item_source = 'chemical' AND c.tenant_id = i.tenant_id AND c.id = i.item_id
        WHERE r.tenant_id = $1
          AND (r.is_assessment = FALSE OR upper($2) = ANY(r.authorized_roles))
        GROUP BY r.id
        ORDER BY r.practical_date, r.lesson_time, r.created_at
      `,
      [tenantId, actorRole],
    );
    return result.rows;
  }

  async getPracticalRequest(tenantId: string, requestId: string, actorRole = '') {
    const requests = await this.getPracticalRequests(tenantId, actorRole);
    return requests.find((request: any) => request.id === requestId) ?? null;
  }

  private async lockPracticalRequest(tenantId: string, requestId: string, actorRole = '') {
    const result = await this.executeSql<{
      id: string;
      status: string;
      last_review_submission_id: string | null;
      last_preparation_submission_id: string | null;
    }>(
      `
        SELECT id::text, status, last_review_submission_id, last_preparation_submission_id
        FROM lab_practical_requests
        WHERE tenant_id = $1 AND id = $2::uuid
          AND (is_assessment = FALSE OR upper($3) = ANY(authorized_roles))
        FOR UPDATE
      `,
      [tenantId, requestId, actorRole],
    );
    const request = result.rows[0];
    if (!request) {
      throw new NotFoundException('Practical request was not found in this school');
    }
    return request;
  }

  private assertPracticalRequestStatus(status: string, allowed: string[], action: string) {
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `This practical request is ${status.replaceAll('_', ' ')} and cannot be ${action}`,
      );
    }
  }

  async reviewPracticalRequest(input: Record<string, any>) {
    return this.withRequestTransaction(async () => {
      const lockedRequest = await this.lockPracticalRequest(
        input.tenant_id,
        input.request_id,
        String(input.actor_role ?? ''),
      );
      if (
        input.submission_id
        && lockedRequest.last_review_submission_id === input.submission_id
      ) {
        const replayed = await this.getPracticalRequest(
          String(input.tenant_id),
          String(input.request_id),
          String(input.actor_role ?? ''),
        );
        if (!replayed) {
          throw new NotFoundException('Practical request was not found in this school');
        }
        return { ...replayed, idempotent_replay: true };
      }
      this.assertPracticalRequestStatus(
        lockedRequest.status,
        ['requested', 'under_review', 'partially_available', 'preparing'],
        'reviewed again',
      );
      for (const item of input.items ?? []) {
        const update = await this.executeSql(
          `
            UPDATE lab_practical_request_items
            SET approved_quantity = $4::numeric,
                substitute_item_id = $5::uuid,
                substitute_item_name = $6,
                status = CASE
                  WHEN $4::numeric = 0 THEN 'unavailable'
                  WHEN $4::numeric < requested_quantity THEN 'partial'
                  ELSE 'available'
                END,
                note = $7,
                updated_at = NOW()
            WHERE tenant_id = $1 AND request_id = $2::uuid AND id = $3::uuid
            RETURNING id
          `,
          [
            input.tenant_id,
            input.request_id,
            item.request_item_id,
            item.approved_quantity,
            item.substitute_item_id ?? null,
            item.substitute_item_name ?? null,
            item.note ?? null,
          ],
        );
        if (!update.rows[0]) {
          throw new NotFoundException('A practical request item was not found in this school');
        }
      }
      const result = await this.insertReturning(
        `
          UPDATE lab_practical_requests
          SET status = $3, rejection_reason = $4, updated_by = $5::uuid,
              last_review_submission_id = $6, updated_at = NOW()
          WHERE tenant_id = $1 AND id = $2::uuid
          RETURNING *
        `,
        [
          input.tenant_id,
          input.request_id,
          input.status,
          input.reason ?? null,
          input.updated_by ?? null,
          input.submission_id ?? null,
        ],
      );
      if (!result) {
        throw new NotFoundException('Practical request was not found in this school');
      }
      return this.getPracticalRequest(String(input.tenant_id), String(input.request_id), String(input.actor_role ?? ''));
    });
  }

  async preparePracticalRequest(input: Record<string, any>) {
    return this.withRequestTransaction(async () => {
      const lockedRequest = await this.lockPracticalRequest(
        input.tenant_id,
        input.request_id,
        String(input.actor_role ?? ''),
      );
      if (
        input.submission_id
        && lockedRequest.last_preparation_submission_id === input.submission_id
      ) {
        const replayed = await this.getPracticalRequest(
          String(input.tenant_id),
          String(input.request_id),
          String(input.actor_role ?? ''),
        );
        if (!replayed) {
          throw new NotFoundException('Practical request was not found in this school');
        }
        return { ...replayed, idempotent_replay: true };
      }
      this.assertPracticalRequestStatus(
        lockedRequest.status,
        ['requested', 'under_review', 'partially_available', 'preparing'],
        'prepared again',
      );
      for (const item of input.items ?? []) {
        if (item.request_item_id) {
          const update = await this.executeSql(
            `
              UPDATE lab_practical_request_items
              SET item_id = COALESCE($4::uuid, item_id),
                  item_source = COALESCE($5, item_source),
                  item_name = $6,
                  unit = $7,
                  prepared_quantity = $8::numeric,
                  is_returnable = $9,
                  substitute_item_id = $10::uuid,
                  substitute_item_name = $11,
                  note = $12,
                  status = CASE
                    WHEN $8::numeric <= 0 THEN 'unavailable'
                    WHEN $8::numeric < requested_quantity THEN 'partial'
                    ELSE 'prepared'
                  END,
                  updated_at = NOW()
              WHERE tenant_id = $1 AND request_id = $2::uuid AND id = $3::uuid
              RETURNING id
            `,
            [
              input.tenant_id,
              input.request_id,
              item.request_item_id,
              item.item_id ?? null,
              item.item_source ?? null,
              item.item_name,
              item.unit,
              item.prepared_quantity,
              item.is_returnable ?? true,
              item.substitute_item_id ?? null,
              item.substitute_item_name ?? null,
              item.note ?? null,
            ],
          );
          if (!update.rows[0]) {
            throw new NotFoundException('A practical preparation item was not found in this school');
          }
        } else {
          await this.executeSql(
            `
              INSERT INTO lab_practical_request_items (
                tenant_id, request_id, item_id, item_source, item_name, unit,
                requested_quantity, approved_quantity, prepared_quantity,
                is_returnable, status, note
              ) VALUES (
                $1, $2::uuid, $3::uuid, $4, $5, $6,
                $7::numeric, $7::numeric, $7::numeric, $8, 'prepared', $9
              )
            `,
            [
              input.tenant_id,
              input.request_id,
              item.item_id ?? null,
              item.item_source ?? null,
              item.item_name,
              item.unit,
              item.prepared_quantity,
              item.is_returnable ?? true,
              item.note ?? null,
            ],
          );
        }
      }
      const status = input.mark_ready ? 'ready' : 'preparing';
      const request = await this.insertReturning(
        `
          UPDATE lab_practical_requests
          SET status = $3, preparation_note = $4, updated_by = $5::uuid,
              last_preparation_submission_id = $6, updated_at = NOW()
          WHERE tenant_id = $1 AND id = $2::uuid
          RETURNING id
        `,
        [
          input.tenant_id,
          input.request_id,
          status,
          input.preparation_note ?? null,
          input.updated_by ?? null,
          input.submission_id ?? null,
        ],
      );
      if (!request) {
        throw new NotFoundException('Practical request was not found in this school');
      }
      return this.getPracticalRequest(String(input.tenant_id), String(input.request_id), String(input.actor_role ?? ''));
    });
  }

  async createPracticalIssue(input: Record<string, any>) {
    const existing = await this.executeSql(
      `SELECT id::text FROM lab_issue_records WHERE tenant_id = $1 AND submission_id = $2 LIMIT 1`,
      [input.tenant_id, input.submission_id],
    );
    if (existing.rows[0]) {
      const existingIssue = await this.getIssueForReturn(
        String(input.tenant_id),
        existing.rows[0].id,
        String(input.actor_role ?? ''),
      );
      if (!existingIssue) {
        throw new NotFoundException('Laboratory issue was not found in this school');
      }
      return {
        ...existingIssue,
        idempotent_replay: true,
      };
    }

    return this.withRequestTransaction(async () => {
      const lockedRequest = await this.lockPracticalRequest(
        input.tenant_id,
        input.request_id,
        String(input.actor_role ?? ''),
      );
      if (lockedRequest.status !== 'ready') {
        const concurrentReplay = await this.executeSql(
          `SELECT id::text FROM lab_issue_records WHERE tenant_id = $1 AND submission_id = $2 LIMIT 1`,
          [input.tenant_id, input.submission_id],
        );
        if (concurrentReplay.rows[0]) {
          const replayedIssue = await this.getIssueForReturn(
            String(input.tenant_id),
            concurrentReplay.rows[0].id,
            String(input.actor_role ?? ''),
          );
          if (!replayedIssue) {
            throw new NotFoundException('Laboratory issue was not found in this school');
          }
          return {
            ...replayedIssue,
            idempotent_replay: true,
          };
        }
        this.assertPracticalRequestStatus(lockedRequest.status, ['ready'], 'issued');
      }
      const issue = await this.insertReturning(
        `
          INSERT INTO lab_issue_records (
            tenant_id, practical_request_id, received_by, expected_return_at,
            notes, submission_id, issued_by
          ) VALUES ($1, $2::uuid, $3, $4::timestamptz, $5, $6, $7::uuid)
          RETURNING *
        `,
        [
          input.tenant_id,
          input.request_id,
          input.received_by,
          input.expected_return_at ?? null,
          input.notes ?? null,
          input.submission_id,
          input.issued_by ?? null,
        ],
      );
      if (!issue) {
        throw new InternalServerErrorException('The laboratory issue record could not be created');
      }

      for (const line of input.items ?? []) {
        const requestItemResult = await this.executeSql(
          `
            SELECT id::text, item_id::text, item_source, item_name, unit,
                   prepared_quantity::text, is_returnable
            FROM lab_practical_request_items
            WHERE tenant_id = $1 AND request_id = $2::uuid AND id = $3::uuid
            FOR UPDATE
          `,
          [input.tenant_id, input.request_id, line.request_item_id],
        );
        const requestItem: any = requestItemResult.rows[0];
        if (!requestItem?.item_id || !requestItem?.item_source) {
          throw new BadRequestException(`${requestItem?.item_name ?? 'A requested item'} is not linked to laboratory stock`);
        }
        if (Number(line.quantity_issued) > Number(requestItem.prepared_quantity)) {
          throw new BadRequestException(`Issued quantity for ${requestItem.item_name} exceeds the prepared quantity`);
        }

        const table = requestItem.item_source === 'chemical' ? 'chemical_items' : 'lab_equipment';
        const quantityInUseClause = requestItem.item_source === 'equipment' && line.is_returnable
          ? ', quantity_in_use = quantity_in_use + $3::numeric'
          : '';
        const stockUpdate = await this.executeSql(
          `
            UPDATE ${table}
            SET quantity_available = quantity_available - $3::numeric
                ${quantityInUseClause},
                updated_at = NOW()
            WHERE tenant_id = $1 AND id = $2::uuid AND quantity_available >= $3::numeric
            RETURNING (quantity_available + $3::numeric)::text AS quantity_before,
                      quantity_available::text AS quantity_after
          `,
          [input.tenant_id, requestItem.item_id, line.quantity_issued],
        );
        const stock: any = stockUpdate.rows[0];
        if (!stock) {
          throw new BadRequestException(`Not enough ${requestItem.item_name} is available to confirm this issue`);
        }

        const issueLine = await this.insertReturning(
          `
            INSERT INTO lab_issue_lines (
              tenant_id, issue_id, request_item_id, item_id, item_source,
              item_name, unit, quantity_issued, is_returnable
            ) VALUES ($1, $2::uuid, $3::uuid, $4::uuid, $5, $6, $7, $8::numeric, $9)
            RETURNING *
          `,
          [
            input.tenant_id,
            issue.id,
            requestItem.id,
            requestItem.item_id,
            requestItem.item_source,
            requestItem.item_name,
            requestItem.unit,
            line.quantity_issued,
            line.is_returnable,
          ],
        );
        await this.recordLabStockMovement({
          tenant_id: input.tenant_id,
          item_id: requestItem.item_id,
          item_source: requestItem.item_source,
          item_name: requestItem.item_name,
          movement_type: 'issued',
          quantity: line.quantity_issued,
          quantity_before: stock.quantity_before,
          quantity_after: stock.quantity_after,
          unit: requestItem.unit,
          practical_request_id: input.request_id,
          issue_id: issue.id,
          reason: `Issued to ${input.received_by}`,
          submission_id: `${input.submission_id}:${issueLine.id}:issued`,
          recorded_by: input.issued_by,
        });
        await this.executeSql(
          `UPDATE lab_practical_request_items SET status = 'issued', updated_at = NOW() WHERE tenant_id = $1 AND id = $2::uuid`,
          [input.tenant_id, requestItem.id],
        );
      }
      await this.executeSql(
        `UPDATE lab_practical_requests SET status = 'issued', updated_by = $3::uuid, updated_at = NOW() WHERE tenant_id = $1 AND id = $2::uuid`,
        [input.tenant_id, input.request_id, input.issued_by ?? null],
      );
      return {
        ...(await this.getIssueForReturn(
          String(input.tenant_id),
          issue.id,
          String(input.actor_role ?? ''),
        )),
        idempotent_replay: false,
      };
    });
  }

  async getIssueForReturn(tenantId: string, issueId: string, actorRole = '') {
    const result = await this.executeSql(
      `
        SELECT issue.id::text, issue.practical_request_id::text, issue.received_by,
               issue.expected_return_at::text,
               CASE
                 WHEN issue.status <> 'returned' AND issue.expected_return_at IS NOT NULL AND issue.expected_return_at < NOW() THEN 'overdue'
                 ELSE issue.status
               END AS status,
               issue.notes, issue.issued_at::text, request.subject, request.class_name,
               request.practical_title, request.teacher_id::text, request.teacher_name,
               request.practical_date::text, request.is_assessment,
               COALESCE(jsonb_agg(
                 jsonb_build_object(
                   'id', line.id::text,
                   'item_id', line.item_id::text,
                   'item_source', line.item_source,
                   'item_name', line.item_name,
                   'unit', line.unit,
                   'quantity_issued', line.quantity_issued,
                   'is_returnable', line.is_returnable,
                   'returned_good', line.returned_good,
                   'used_or_consumed', line.used_or_consumed,
                   'broken', line.broken,
                   'missing', line.missing,
                   'still_with_teacher', line.still_with_teacher,
                   'sent_for_maintenance', line.sent_for_maintenance,
                   'spilled_or_wasted', line.spilled_or_wasted
                 ) ORDER BY line.created_at
               ) FILTER (WHERE line.id IS NOT NULL), '[]'::jsonb) AS items
        FROM lab_issue_records issue
        INNER JOIN lab_practical_requests request
          ON request.tenant_id = issue.tenant_id AND request.id = issue.practical_request_id
        LEFT JOIN lab_issue_lines line
          ON line.tenant_id = issue.tenant_id AND line.issue_id = issue.id
        WHERE issue.tenant_id = $1 AND issue.id = $2::uuid
          AND (request.is_assessment = FALSE OR upper($3) = ANY(request.authorized_roles))
        GROUP BY issue.id, request.id
      `,
      [tenantId, issueId, actorRole],
    );
    return result.rows[0] ?? null;
  }

  async listPracticalIssues(tenantId: string, actorRole = '') {
    const result = await this.executeSql(
      `
        SELECT issue.id::text
        FROM lab_issue_records issue
        INNER JOIN lab_practical_requests request
          ON request.tenant_id = issue.tenant_id AND request.id = issue.practical_request_id
        WHERE issue.tenant_id = $1
          AND (request.is_assessment = FALSE OR upper($2) = ANY(request.authorized_roles))
        ORDER BY
          CASE WHEN issue.status IN ('issued', 'partially_returned', 'unresolved') THEN 0 ELSE 1 END,
          issue.expected_return_at NULLS LAST,
          issue.issued_at DESC
        LIMIT 100
      `,
      [tenantId, actorRole],
    );
    const issues = [];
    for (const row of result.rows as any[]) {
      const issue = await this.getIssueForReturn(tenantId, row.id, actorRole);
      if (issue) issues.push(issue);
    }
    return issues;
  }

  async receivePracticalReturn(input: Record<string, any>) {
    const replay = await this.executeSql(
      `SELECT id::text FROM lab_issue_returns WHERE tenant_id = $1 AND submission_id = $2 LIMIT 1`,
      [input.tenant_id, input.submission_id],
    );
    if (replay.rows[0]) {
      const replayedIssue = await this.getIssueForReturn(
        String(input.tenant_id),
        String(input.issue_id),
        String(input.actor_role ?? ''),
      );
      if (!replayedIssue) {
        throw new NotFoundException('Laboratory issue was not found in this school');
      }
      return {
        ...replayedIssue,
        idempotent_replay: true,
      };
    }

    return this.withRequestTransaction(async () => {
      await this.executeSql(
        `
          INSERT INTO lab_issue_returns (tenant_id, issue_id, submission_id, notes, recorded_by)
          VALUES ($1, $2::uuid, $3, $4, $5::uuid)
        `,
        [input.tenant_id, input.issue_id, input.submission_id, input.notes ?? null, input.recorded_by ?? null],
      );
      const issueContext: any = await this.getIssueForReturn(
        String(input.tenant_id),
        String(input.issue_id),
        String(input.actor_role ?? ''),
      );
      if (!issueContext) {
        throw new NotFoundException('Laboratory issue was not found in this school');
      }

      for (const next of input.items ?? []) {
        const lineResult = await this.executeSql(
          `SELECT * FROM lab_issue_lines WHERE tenant_id = $1 AND issue_id = $2::uuid AND id = $3::uuid FOR UPDATE`,
          [input.tenant_id, input.issue_id, next.issue_line_id],
        );
        const previous: any = lineResult.rows[0];
        if (!previous) {
          throw new NotFoundException('An issued item was not found in this school');
        }
        const finalValues = {
          returned_good: Number(next.returned_good),
          used_or_consumed: Number(next.used_or_consumed),
          broken: Number(next.broken),
          missing: Number(next.missing),
          still_with_teacher: Number(next.still_with_teacher),
          sent_for_maintenance: Number(next.sent_for_maintenance),
          spilled_or_wasted: Number(next.spilled_or_wasted),
        };
        const accounted = Object.values(finalValues).reduce((sum, value) => sum + value, 0);
        if (accounted > Number(previous.quantity_issued) + 0.0001) {
          throw new BadRequestException(`Return quantities for ${previous.item_name} exceed the quantity issued`);
        }
        for (const key of ['returned_good', 'used_or_consumed', 'broken', 'missing', 'sent_for_maintenance', 'spilled_or_wasted'] as const) {
          if (finalValues[key] + 0.0001 < Number(previous[key])) {
            throw new BadRequestException(`Previously recorded ${previous.item_name} return quantities cannot be reduced`);
          }
        }

        const deltas = {
          returned_good: finalValues.returned_good - Number(previous.returned_good),
          used_or_consumed: finalValues.used_or_consumed - Number(previous.used_or_consumed),
          broken: finalValues.broken - Number(previous.broken),
          missing: finalValues.missing - Number(previous.missing),
          sent_for_maintenance: finalValues.sent_for_maintenance - Number(previous.sent_for_maintenance),
          spilled_or_wasted: finalValues.spilled_or_wasted - Number(previous.spilled_or_wasted),
        };

        if (previous.item_source === 'equipment') {
          const resolvedDelta = previous.is_returnable
            ? deltas.returned_good + deltas.used_or_consumed + deltas.broken + deltas.missing + deltas.sent_for_maintenance + deltas.spilled_or_wasted
            : 0;
          await this.executeSql(
            `
              UPDATE lab_equipment
              SET quantity_available = quantity_available + $3::numeric,
                  quantity_in_use = GREATEST(0, quantity_in_use - $4::numeric),
                  quantity_damaged = quantity_damaged + $5::numeric,
                  quantity_missing = quantity_missing + $6::numeric,
                  quantity_under_maintenance = quantity_under_maintenance + $7::numeric,
                  updated_at = NOW()
              WHERE tenant_id = $1 AND id = $2::uuid
            `,
            [
              input.tenant_id,
              previous.item_id,
              deltas.returned_good,
              resolvedDelta,
              deltas.broken,
              deltas.missing,
              deltas.sent_for_maintenance,
            ],
          );
        } else if (deltas.returned_good > 0) {
          await this.executeSql(
            `UPDATE chemical_items SET quantity_available = quantity_available + $3::numeric, updated_at = NOW() WHERE tenant_id = $1 AND id = $2::uuid`,
            [input.tenant_id, previous.item_id, deltas.returned_good],
          );
        }

        await this.executeSql(
          `
            UPDATE lab_issue_lines
            SET returned_good = $4::numeric, used_or_consumed = $5::numeric,
                broken = $6::numeric, missing = $7::numeric,
                still_with_teacher = $8::numeric, sent_for_maintenance = $9::numeric,
                spilled_or_wasted = $10::numeric, updated_at = NOW()
            WHERE tenant_id = $1 AND issue_id = $2::uuid AND id = $3::uuid
          `,
          [
            input.tenant_id,
            input.issue_id,
            next.issue_line_id,
            finalValues.returned_good,
            finalValues.used_or_consumed,
            finalValues.broken,
            finalValues.missing,
            finalValues.still_with_teacher,
            finalValues.sent_for_maintenance,
            finalValues.spilled_or_wasted,
          ],
        );

        const movementDefinitions = [
          ['returned', deltas.returned_good],
          ['consumed', deltas.used_or_consumed],
          ['broken', deltas.broken],
          ['missing', deltas.missing],
          ['maintenance', deltas.sent_for_maintenance],
          ['wasted', deltas.spilled_or_wasted],
        ] as const;
        const currentItem: any = await this.getLaboratoryItem(String(input.tenant_id), previous.item_source, previous.item_id);
        for (const [movementType, quantity] of movementDefinitions) {
          if (quantity <= 0) continue;
          await this.recordLabStockMovement({
            tenant_id: input.tenant_id,
            item_id: previous.item_id,
            item_source: previous.item_source,
            item_name: previous.item_name,
            movement_type: movementType,
            quantity,
            quantity_before: currentItem?.quantity_available ?? 0,
            quantity_after: currentItem?.quantity_available ?? 0,
            unit: previous.unit,
            practical_request_id: issueContext.practical_request_id ?? null,
            issue_id: input.issue_id,
            reason: input.notes ?? `Return recorded: ${movementType}`,
            submission_id: `${input.submission_id}:${next.issue_line_id}:${movementType}`,
            recorded_by: input.recorded_by,
          });
        }

        for (const [classification, quantity] of [
          ['accidental_breakage', deltas.broken],
          ['missing', deltas.missing],
          ['chemical_spill', deltas.spilled_or_wasted],
        ] as const) {
          if (quantity <= 0) continue;
          await this.insertBreakageLossRecord({
            tenant_id: input.tenant_id,
            item_id: previous.item_id,
            item_source: previous.item_source,
            item_name: previous.item_name,
            quantity,
            date: new Date().toISOString().slice(0, 10),
            practical_request_id: issueContext.practical_request_id ?? null,
            practical_or_activity: issueContext.practical_title ?? 'Practical return',
            class_name: issueContext.class_name ?? null,
            teacher_name: issueContext.teacher_name ?? null,
            classification,
            explanation: input.notes ?? `${previous.item_name} recorded during return`,
            submission_id: `${input.submission_id}:${next.issue_line_id}:${classification}`,
            recorded_by: input.recorded_by,
          });
        }
      }

      const unresolved = await this.executeSql(
        `
          SELECT COALESCE(SUM(
            quantity_issued - returned_good - used_or_consumed - broken - missing
            - sent_for_maintenance - spilled_or_wasted
          ), 0)::text AS remaining,
          COALESCE(SUM(returned_good + used_or_consumed + broken + missing + sent_for_maintenance + spilled_or_wasted), 0)::text AS resolved
          FROM lab_issue_lines
          WHERE tenant_id = $1 AND issue_id = $2::uuid
        `,
        [input.tenant_id, input.issue_id],
      );
      const remaining = Number(unresolved.rows[0]?.remaining ?? 0);
      const resolved = Number(unresolved.rows[0]?.resolved ?? 0);
      const status = remaining <= 0.0001 ? 'returned' : resolved > 0 ? 'partially_returned' : 'issued';
      const issue = await this.insertReturning(
        `
          UPDATE lab_issue_records
          SET status = $3, last_return_at = NOW(), updated_at = NOW()
          WHERE tenant_id = $1 AND id = $2::uuid
          RETURNING practical_request_id::text
        `,
        [input.tenant_id, input.issue_id, status],
      );
      if (!issue) {
        throw new NotFoundException('Laboratory issue was not found in this school');
      }
      await this.executeSql(
        `UPDATE lab_practical_requests SET status = $3, updated_at = NOW() WHERE tenant_id = $1 AND id = $2::uuid`,
        [input.tenant_id, issue.practical_request_id, status === 'returned' ? 'completed' : 'partially_returned'],
      );
      return {
        ...(await this.getIssueForReturn(
          String(input.tenant_id),
          String(input.issue_id),
          String(input.actor_role ?? ''),
        )),
        idempotent_replay: false,
      };
    });
  }

  async insertBreakageLossRecord(input: Record<string, unknown>) {
    return this.insertReturning(
      `
        INSERT INTO lab_breakage_loss_records (
          tenant_id, item_id, item_source, item_name, quantity, incident_date,
          practical_request_id, practical_or_activity, class_name, teacher_name,
          classification, explanation, referral_required, referral_status,
          submission_id, recorded_by
        ) VALUES (
          $1, $2::uuid, $3, $4, $5::numeric, $6::date, $7::uuid, $8, $9, $10,
          $11, $12, $13, $14, $15, $16::uuid
        )
        ON CONFLICT (tenant_id, submission_id) WHERE submission_id IS NOT NULL DO NOTHING
        RETURNING *
      `,
      [
        input.tenant_id,
        input.item_id ?? null,
        input.item_source ?? null,
        input.item_name,
        input.quantity,
        input.date,
        input.practical_request_id ?? null,
        input.practical_or_activity ?? null,
        input.class_name ?? null,
        input.teacher_name ?? null,
        input.classification,
        input.explanation,
        input.referral_required ?? false,
        input.referral_status ?? null,
        input.submission_id ?? null,
        input.recorded_by ?? null,
      ],
    );
  }

  async recordBreakageLoss(input: Record<string, any>) {
    const replay = await this.executeSql(
      `
        SELECT incident.*
        FROM lab_breakage_loss_records incident
        LEFT JOIN lab_practical_requests request
          ON request.tenant_id = incident.tenant_id
         AND request.id = incident.practical_request_id
        WHERE incident.tenant_id = $1 AND incident.submission_id = $2
          AND (
            incident.practical_request_id IS NULL
            OR request.is_assessment = FALSE
            OR upper($3) = ANY(request.authorized_roles)
          )
        LIMIT 1
      `,
      [input.tenant_id, input.submission_id, String(input.actor_role ?? '')],
    );
    if (replay.rows[0]) return { ...replay.rows[0], idempotent_replay: true };

    return this.withRequestTransaction(async () => {
      let quantityBefore: number | null = null;
      let quantityAfter: number | null = null;
      let itemUnit: string | null = null;
      if (input.item_id && input.item_source) {
        const currentItem: any = await this.getLaboratoryItem(
          String(input.tenant_id),
          String(input.item_source),
          String(input.item_id),
        );
        if (!currentItem) {
          throw new NotFoundException('Laboratory item was not found in this school');
        }
        quantityBefore = Number(currentItem.quantity_available);
        itemUnit = String(currentItem.unit);
        if (input.item_source === 'equipment') {
          const targetColumn = input.classification === 'missing' ? 'quantity_missing' : 'quantity_damaged';
          const updated = await this.executeSql(
            `
              UPDATE lab_equipment
              SET quantity_available = quantity_available - $3::numeric,
                  ${targetColumn} = ${targetColumn} + $3::numeric,
                  updated_at = NOW()
              WHERE tenant_id = $1 AND id = $2::uuid AND quantity_available >= $3::numeric
              RETURNING id, quantity_available::text
            `,
            [input.tenant_id, input.item_id, input.quantity],
          );
          if (!updated.rows[0]) {
            throw new BadRequestException(`There is not enough available ${input.item_name} to record this quantity`);
          }
          quantityAfter = Number(updated.rows[0].quantity_available);
        } else {
          const updated = await this.executeSql(
            `
              UPDATE chemical_items
              SET quantity_available = quantity_available - $3::numeric, updated_at = NOW()
              WHERE tenant_id = $1 AND id = $2::uuid AND quantity_available >= $3::numeric
              RETURNING id, quantity_available::text
            `,
            [input.tenant_id, input.item_id, input.quantity],
          );
          if (!updated.rows[0]) {
            throw new BadRequestException(`There is not enough available ${input.item_name} to record this quantity`);
          }
          quantityAfter = Number(updated.rows[0].quantity_available);
        }
      }
      const record = await this.insertBreakageLossRecord(input);
      if (!record) {
        throw new InternalServerErrorException('Breakage or loss could not be recorded');
      }
      if (input.item_id && input.item_source && quantityBefore !== null && quantityAfter !== null && itemUnit) {
        const movementType = input.classification === 'missing'
          ? 'missing'
          : input.classification === 'chemical_spill'
            ? 'wasted'
            : 'broken';
        await this.recordLabStockMovement({
          tenant_id: input.tenant_id,
          item_id: input.item_id,
          item_source: input.item_source,
          item_name: input.item_name,
          movement_type: movementType,
          quantity: input.quantity,
          quantity_before: quantityBefore,
          quantity_after: quantityAfter,
          unit: itemUnit,
          practical_request_id: input.practical_request_id ?? null,
          reason: input.explanation,
          submission_id: `${input.submission_id}:movement`,
          recorded_by: input.recorded_by,
        });
      }
      return { ...record, idempotent_replay: false };
    });
  }

  async listBreakageLoss(tenantId: string, actorRole = '') {
    const result = await this.executeSql(
      `
        SELECT incident.id::text, incident.item_id::text, incident.item_source,
               incident.item_name, incident.quantity::text,
               incident.incident_date::text AS date, incident.practical_or_activity,
               incident.class_name, incident.teacher_name, incident.classification,
               incident.explanation, incident.status, incident.referral_required,
               incident.referral_status,
               COALESCE(NULLIF(recorder.full_name, ''), recorder.email, incident.recorded_by::text) AS recorded_by,
               incident.created_at::text
        FROM lab_breakage_loss_records incident
        LEFT JOIN lab_practical_requests request
          ON request.tenant_id = incident.tenant_id
         AND request.id = incident.practical_request_id
        LEFT JOIN users recorder ON recorder.id = incident.recorded_by
        WHERE incident.tenant_id = $1
          AND (
            incident.practical_request_id IS NULL
            OR request.is_assessment = FALSE
            OR upper($2) = ANY(request.authorized_roles)
          )
        ORDER BY incident.incident_date DESC, incident.created_at DESC
        LIMIT 200
      `,
      [tenantId, actorRole],
    );
    return result.rows;
  }

  async startStocktake(input: Record<string, any>) {
    const existing = await this.executeSql(
      `SELECT id::text FROM lab_stocktakes WHERE tenant_id = $1 AND submission_id = $2 LIMIT 1`,
      [input.tenant_id, input.submission_id],
    );
    if (existing.rows[0]) return this.getStocktake(String(input.tenant_id), existing.rows[0].id);

    return this.withRequestTransaction(async () => {
      const stocktake = await this.insertReturning(
        `
          INSERT INTO lab_stocktakes (
            tenant_id, location_id, location_name, category, item_type,
            submission_id, started_by
          ) VALUES ($1, $2::uuid, $3, $4, $5, $6, $7::uuid)
          RETURNING *
        `,
        [
          input.tenant_id,
          input.location_id ?? null,
          input.location_name,
          input.category ?? null,
          input.item_type ?? null,
          input.submission_id,
          input.started_by ?? null,
        ],
      );
      await this.executeSql(
        `
          INSERT INTO lab_stocktake_lines (
            tenant_id, stocktake_id, item_id, item_source, item_name, unit, expected_quantity
          )
          SELECT $1, $2::uuid, item.id, item.item_source, item.name, item.unit, item.quantity_available
          FROM (
            SELECT id, 'equipment'::text AS item_source, name, unit, quantity_available,
                   storage_location, category, item_type
            FROM lab_equipment WHERE tenant_id = $1
            UNION ALL
            SELECT id, 'chemical'::text AS item_source, name, unit, quantity_available,
                   storage_location, category, 'chemical'::text AS item_type
            FROM chemical_items WHERE tenant_id = $1
          ) item
          WHERE lower(COALESCE(item.storage_location, '')) = lower($3)
            AND ($4::text IS NULL OR lower(item.category) = lower($4))
            AND ($5::text IS NULL OR item.item_type = $5)
          ORDER BY lower(item.name)
        `,
        [input.tenant_id, stocktake.id, input.location_name, input.category ?? null, input.item_type ?? null],
      );
      return this.getStocktake(String(input.tenant_id), stocktake.id);
    });
  }

  async getStocktake(tenantId: string, stocktakeId: string) {
    const result = await this.executeSql(
      `
        SELECT stocktake.id::text, stocktake.location_id::text, stocktake.location_name,
               stocktake.category, stocktake.item_type, stocktake.status,
               stocktake.current_position, stocktake.notes,
               stocktake.started_at::text, stocktake.submitted_at::text,
               COALESCE(jsonb_agg(
                 jsonb_build_object(
                   'id', line.id::text,
                   'item_id', line.item_id::text,
                   'item_source', line.item_source,
                   'item_name', line.item_name,
                   'unit', line.unit,
                   'expected_quantity', line.expected_quantity,
                   'counted_quantity', line.counted_quantity,
                   'condition', line.condition,
                   'difference', line.difference
                 ) ORDER BY lower(line.item_name)
               ) FILTER (WHERE line.id IS NOT NULL), '[]'::jsonb) AS items
        FROM lab_stocktakes stocktake
        LEFT JOIN lab_stocktake_lines line
          ON line.tenant_id = stocktake.tenant_id AND line.stocktake_id = stocktake.id
        WHERE stocktake.tenant_id = $1 AND stocktake.id = $2::uuid
        GROUP BY stocktake.id
      `,
      [tenantId, stocktakeId],
    );
    return result.rows[0] ?? null;
  }

  async listStocktakes(tenantId: string) {
    const result = await this.executeSql(
      `SELECT id::text FROM lab_stocktakes WHERE tenant_id = $1 ORDER BY started_at DESC LIMIT 50`,
      [tenantId],
    );
    const stocktakes = [];
    for (const row of result.rows as any[]) {
      const stocktake = await this.getStocktake(tenantId, row.id);
      if (stocktake) stocktakes.push(stocktake);
    }
    return stocktakes;
  }

  async saveStocktake(input: Record<string, any>) {
    return this.withRequestTransaction(async () => {
      const lifecycle = await this.executeSql<{ id: string; status: string }>(
        `
          SELECT id::text, status
          FROM lab_stocktakes
          WHERE tenant_id = $1 AND id = $2::uuid
          FOR UPDATE
        `,
        [input.tenant_id, input.stocktake_id],
      );
      if (!lifecycle.rows[0]) throw new NotFoundException('Stocktake was not found in this school');
      if (lifecycle.rows[0].status === 'submitted') {
        throw new BadRequestException('This stocktake has already been submitted and cannot be changed');
      }
      for (const line of input.items ?? []) {
        const update = await this.executeSql(
          `
            UPDATE lab_stocktake_lines
            SET counted_quantity = $4::numeric,
                difference = $4::numeric - expected_quantity,
                condition = $5,
                updated_at = NOW()
            WHERE tenant_id = $1 AND stocktake_id = $2::uuid AND id = $3::uuid
            RETURNING id
          `,
          [input.tenant_id, input.stocktake_id, line.line_id, line.counted_quantity, line.condition ?? null],
        );
        if (!update.rows[0]) throw new NotFoundException('A stocktake item was not found in this school');
      }
      const updatedStocktake = await this.executeSql(
        `
          UPDATE lab_stocktakes
          SET notes = $3, current_position = $4, status = 'in_progress', updated_at = NOW()
          WHERE tenant_id = $1 AND id = $2::uuid AND status <> 'submitted'
          RETURNING id::text
        `,
        [input.tenant_id, input.stocktake_id, input.notes ?? null, input.current_position ?? 0],
      );
      if (!updatedStocktake.rows[0]) {
        throw new BadRequestException('This stocktake has already been submitted and cannot be changed');
      }
      return this.getStocktake(String(input.tenant_id), String(input.stocktake_id));
    });
  }

  async submitStocktake(input: Record<string, any>) {
    return this.withRequestTransaction(async () => {
      const lifecycle = await this.executeSql<{ id: string; status: string }>(
        `
          SELECT id::text, status
          FROM lab_stocktakes
          WHERE tenant_id = $1 AND id = $2::uuid
          FOR UPDATE
        `,
        [input.tenant_id, input.stocktake_id],
      );
      if (!lifecycle.rows[0]) throw new NotFoundException('Stocktake was not found in this school');
      if (lifecycle.rows[0].status === 'submitted') {
        const submitted = await this.getStocktake(String(input.tenant_id), String(input.stocktake_id));
        return { ...submitted, idempotent_replay: true };
      }
      for (const line of input.items ?? []) {
        const update = await this.executeSql(
          `
            UPDATE lab_stocktake_lines
            SET counted_quantity = $4::numeric,
                difference = $4::numeric - expected_quantity,
                condition = $5,
                updated_at = NOW()
            WHERE tenant_id = $1 AND stocktake_id = $2::uuid AND id = $3::uuid
            RETURNING id
          `,
          [input.tenant_id, input.stocktake_id, line.line_id, line.counted_quantity, line.condition ?? null],
        );
        if (!update.rows[0]) throw new NotFoundException('A stocktake item was not found in this school');
      }
      const stocktake: any = await this.getStocktake(String(input.tenant_id), String(input.stocktake_id));
      if (!stocktake) throw new NotFoundException('Stocktake was not found in this school');
      const items = Array.isArray(stocktake.items) ? stocktake.items : [];
      if (items.some((item: any) => item.counted_quantity === null || item.counted_quantity === undefined)) {
        throw new BadRequestException('Count every listed item before submitting this location');
      }
      for (const item of items) {
        const before = Number(item.expected_quantity);
        const after = Number(item.counted_quantity);
        if (item.item_source === 'equipment') {
          await this.executeSql(
            `
              UPDATE lab_equipment
              SET quantity_available = $3::numeric,
                  quantity_total = $3::numeric + quantity_in_use + quantity_damaged
                    + quantity_missing + quantity_under_maintenance,
                  condition_status = COALESCE($4, condition_status),
                  updated_at = NOW()
              WHERE tenant_id = $1 AND id = $2::uuid
            `,
            [input.tenant_id, item.item_id, after, item.condition ?? null],
          );
        } else {
          await this.executeSql(
            `
              UPDATE chemical_items
              SET quantity_available = $3::numeric, quantity_total = $3::numeric, updated_at = NOW()
              WHERE tenant_id = $1 AND id = $2::uuid
            `,
            [input.tenant_id, item.item_id, after],
          );
        }
        if (Math.abs(after - before) > 0.0001) {
          await this.recordLabStockMovement({
            tenant_id: input.tenant_id,
            item_id: item.item_id,
            item_source: item.item_source,
            item_name: item.item_name,
            movement_type: 'stocktake_adjustment',
            quantity: Math.abs(after - before),
            quantity_before: before,
            quantity_after: after,
            unit: item.unit,
            stocktake_id: input.stocktake_id,
            reason: input.notes ?? `Physical count at ${stocktake.location_name}`,
            submission_id: `stocktake:${input.stocktake_id}:${item.id}`,
            recorded_by: input.submitted_by,
          });
        }
      }
      const submittedStocktake = await this.executeSql(
        `
          UPDATE lab_stocktakes
          SET status = 'submitted', notes = COALESCE($3, notes), submitted_by = $4::uuid,
              submitted_at = NOW(), updated_at = NOW()
          WHERE tenant_id = $1 AND id = $2::uuid AND status <> 'submitted'
          RETURNING id::text
        `,
        [input.tenant_id, input.stocktake_id, input.notes ?? null, input.submitted_by ?? null],
      );
      if (!submittedStocktake.rows[0]) {
        throw new BadRequestException('This stocktake was submitted by another request; reload the completed stocktake');
      }
      return { ...(await this.getStocktake(String(input.tenant_id), String(input.stocktake_id))), idempotent_replay: false };
    });
  }

  async saveSafetyCheck(input: Record<string, any>) {
    const existing = await this.executeSql(
      `SELECT * FROM lab_safety_checks WHERE tenant_id = $1 AND submission_id = $2 LIMIT 1`,
      [input.tenant_id, input.submission_id],
    );
    if (existing.rows[0]) return { ...existing.rows[0], idempotent_replay: true };
    return this.insertReturning(
      `
        INSERT INTO lab_safety_checks (
          tenant_id, location_name, checked_on, next_due_date, checklist,
          notes, status, submission_id, checked_by
        ) VALUES ($1, $2, $3::date, $4::date, $5::jsonb, $6, $7, $8, $9::uuid)
        ON CONFLICT (tenant_id, submission_id) WHERE submission_id IS NOT NULL
        DO UPDATE SET updated_at = lab_safety_checks.updated_at
        RETURNING *
      `,
      [
        input.tenant_id,
        input.location_name,
        input.checked_on,
        input.next_due_date,
        JSON.stringify(input.checklist ?? []),
        input.notes ?? null,
        (input.checklist ?? []).some((item: any) => item.checked === false) ? 'follow_up_required' : 'completed',
        input.submission_id,
        input.checked_by ?? null,
      ],
    );
  }

  async listSafetyChecks(tenantId: string) {
    const result = await this.executeSql(
      `
        SELECT id::text, location_name, checked_on::text, next_due_date::text,
               checklist, notes,
               CASE WHEN next_due_date < CURRENT_DATE THEN 'Due' ELSE status END AS status,
               created_at::text
        FROM lab_safety_checks
        WHERE tenant_id = $1
        ORDER BY next_due_date, created_at DESC
        LIMIT 100
      `,
      [tenantId],
    );
    return result.rows;
  }

  async getLaboratoryHome(tenantId: string, actorRole = '') {
    const [requests, issues, inventory, breakages, safetyChecks] = await Promise.all([
      this.getPracticalRequests(tenantId, actorRole),
      this.listPracticalIssues(tenantId, actorRole),
      this.listLaboratoryInventory(tenantId),
      this.listBreakageLoss(tenantId, actorRole),
      this.listSafetyChecks(tenantId),
    ]);
    const todayParts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Nairobi',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const todayPart = (type: Intl.DateTimeFormatPartTypes) => todayParts.find((part) => part.type === type)?.value ?? '';
    const today = `${todayPart('year')}-${todayPart('month')}-${todayPart('day')}`;
    const todayTime = Date.parse(`${today}T00:00:00Z`);
    const expiryAttentionEnd = todayTime + 90 * 24 * 60 * 60 * 1000;
    const todayPracticals = requests.filter((request: any) => request.practical_date === today);
    const awaitingReturn = issues.filter((issue: any) => ['issued', 'partially_returned', 'unresolved', 'overdue'].includes(issue.status));
    const attention = [
      ...inventory.items.flatMap((item: any) => {
        const itemAttention = [];
        if (['Low Stock', 'Out of Stock', 'Expired', 'Damaged', 'Missing', 'Under Maintenance'].includes(item.status)) {
          itemAttention.push({
            id: `item:${item.item_source}:${item.id}:${item.status}`,
            type: item.status,
            title: item.item_name,
            detail: `${item.quantity_available} ${item.unit} at ${item.storage_location || 'location not set'}`,
            severity: ['Out of Stock', 'Expired', 'Missing'].includes(item.status) ? 'danger' : 'warning',
          });
        }
        const expiryTime = item.item_source === 'chemical' && item.expiry_date
          ? Date.parse(`${item.expiry_date}T00:00:00Z`)
          : Number.NaN;
        if (Number.isFinite(expiryTime) && expiryTime >= todayTime && expiryTime <= expiryAttentionEnd) {
          itemAttention.push({
            id: `item:${item.item_source}:${item.id}:expiring`,
            type: 'Expiring Chemical',
            title: item.item_name,
            detail: `Expires on ${item.expiry_date}; stored at ${item.storage_location || 'location not set'}`,
            severity: 'warning',
          });
        }
        return itemAttention;
      }),
      ...awaitingReturn
        .filter((issue: any) => issue.status === 'overdue')
        .map((issue: any) => ({
          id: `issue:${issue.id}`,
          type: 'Overdue Return',
          title: issue.practical_title,
          detail: `${issue.received_by} - ${issue.class_name}`,
          severity: 'danger',
        })),
      ...breakages
        .filter((record: any) => record.status === 'unresolved')
        .map((record: any) => ({
          id: `breakage:${record.id}`,
          type: record.classification === 'missing' ? 'Missing' : 'Damage Unresolved',
          title: record.item_name,
          detail: `${record.quantity} recorded on ${record.date}`,
          severity: 'warning',
        })),
      ...safetyChecks
        .filter((check: any) => check.status === 'Due')
        .map((check: any) => ({
          id: `safety:${check.id}`,
          type: 'Safety Inspection Due',
          title: check.location_name,
          detail: `Due ${check.next_due_date}`,
          severity: 'warning',
        })),
    ];
    return { today: todayPracticals, awaiting_return: awaitingReturn, attention };
  }

  async getRegisterData(tenantId: string, reportType: string, input: Record<string, unknown>) {
    const [tenant, actor] = await Promise.all([
      this.executeSql(
        `
          SELECT name,
                 CASE
                   WHEN NULLIF(settings->>'logo_storage_path', '') IS NOT NULL THEN '/api/school/identity/logo'
                   ELSE NULLIF(settings->>'logo_url', '')
                 END AS logo_url
          FROM tenants
          WHERE tenant_id = $1
          LIMIT 1
        `,
        [tenantId],
      ),
      input.generated_by
        ? this.executeSql(
            `
              SELECT COALESCE(NULLIF(users.full_name, ''), users.email) AS generated_by
              FROM users
              INNER JOIN tenant_memberships membership
                ON membership.user_id = users.id AND membership.tenant_id = $1
              WHERE users.id = $2::uuid
              LIMIT 1
            `,
            [tenantId, input.generated_by],
          )
        : Promise.resolve({ rows: [] as any[], rowCount: 0 }),
    ]);
    let rows: any[] = [];
    const actorRole = String(input.actor_role ?? '').trim().toUpperCase();
    const canViewAllPracticals = [
      'LAB_TECHNICIAN',
      'PRINCIPAL',
      'DEPUTY_PRINCIPAL',
      'DEAN_ACADEMICS',
      'EXAMS_MANAGER',
    ].includes(actorRole);
    const generatedBy = String(input.generated_by ?? '');
    switch (reportType) {
      case 'issue_return_register':
        rows = await this.listPracticalIssues(tenantId, actorRole);
        if (!canViewAllPracticals) {
          rows = rows.filter((row: any) => row.teacher_id === generatedBy);
        }
        break;
      case 'breakage_loss_register':
        rows = await this.listBreakageLoss(tenantId, actorRole);
        break;
      case 'stocktake_sheet':
        rows = await this.listStocktakes(tenantId);
        break;
      case 'practical_preparation_checklist':
        rows = await this.getPracticalRequests(tenantId, actorRole);
        if (!canViewAllPracticals) {
          rows = rows.filter((row: any) => row.teacher_id === generatedBy);
        }
        break;
      default: {
        const inventory = await this.listLaboratoryInventory(tenantId);
        rows = inventory.items.filter((item: any) => {
          if (reportType === 'chemicals_register') return item.item_source === 'chemical';
          if (reportType === 'apparatus_register') return item.item_type === 'apparatus' || item.item_type === 'safety_equipment';
          if (reportType === 'consumables_register') return item.item_type === 'consumable';
          if (reportType === 'expired_chemicals_register') return item.item_source === 'chemical' && item.status === 'Expired';
          if (reportType === 'low_stock_list') return ['Low Stock', 'Out of Stock'].includes(item.status);
          return true;
        });
      }
    }
    const dateFrom = typeof input.date_from === 'string' ? input.date_from : null;
    const dateTo = typeof input.date_to === 'string' ? input.date_to : null;
    const locationFilter = typeof input.location_filter === 'string'
      ? input.location_filter.trim().toLowerCase()
      : null;
    rows = rows.filter((row: any) => {
      const rowDate = String(
        row.date ?? row.incident_date ?? row.practical_date ?? row.issued_at
          ?? row.started_at ?? row.checked_on ?? row.created_at ?? '',
      ).slice(0, 10);
      if (dateFrom && rowDate && rowDate < dateFrom) return false;
      if (dateTo && rowDate && rowDate > dateTo) return false;
      if (locationFilter) {
        const rowLocation = String(row.storage_location ?? row.location_name ?? '').toLowerCase();
        if (!rowLocation.includes(locationFilter)) return false;
      }
      return true;
    });
    return {
      document_number: `LAB-${reportType.toUpperCase().replace(/[^A-Z0-9]+/g, '-')}-${Date.now()}`,
      school_name: tenant.rows[0]?.name ?? 'School',
      school_logo: tenant.rows[0]?.logo_url ?? null,
      laboratory: input.laboratory ?? 'School Laboratory',
      location_filter: input.location_filter ?? null,
      report_type: reportType,
      date_from: input.date_from ?? null,
      date_to: input.date_to ?? null,
      generated_at: new Date().toISOString(),
      generated_by: actor.rows[0]?.generated_by ?? String(input.generated_by ?? 'Authenticated user'),
      rows,
    };
  }
}
