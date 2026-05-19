import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../../database/database.service';

@Injectable()
export class LabsRepository {
  constructor(private readonly databaseService: DatabaseService) {}

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
      const result = await this.databaseService.query(
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
    return this.databaseService.withRequestTransaction(async () => {
      await this.databaseService.query(
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
    const result = await this.databaseService.query(
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
    return this.databaseService.withRequestTransaction(async () => {
      await this.databaseService.query(
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
    const result = await this.databaseService.query(
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
    const result = await this.databaseService.query<{ total: string }>(
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
    const result = await this.databaseService.query(
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
    const result = await this.databaseService.query<{
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
    const result = await this.databaseService.query<{
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
    const result = await this.databaseService.query<{
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
    const result = await this.databaseService.query<{ unreconciled: string }>(
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
    await this.databaseService.query(
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
    const result = await this.databaseService.query(sql, values);

    return result.rows[0];
  }
}
