import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../../database/database.service';

@Injectable()
export class BiometricAttendanceRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  registerDevice(input: Record<string, unknown>) {
    return this.insertReturning(
      `
        INSERT INTO biometric_devices (
          tenant_id, name, location, type, registered_by
        )
        VALUES ($1, $2, $3, $4, $5::uuid)
        RETURNING *
      `,
      [input.tenant_id, input.name, input.location, input.type, input.registered_by],
    );
  }

  enrollIdentity(input: Record<string, unknown>) {
    return this.insertReturning(
      `
        INSERT INTO biometric_identities (
          tenant_id, teacher_user_id, biometric_hash, enrolled_by
        )
        VALUES ($1, $2::uuid, $3, $4::uuid)
        ON CONFLICT (tenant_id, biometric_hash)
        DO UPDATE SET
          teacher_user_id = EXCLUDED.teacher_user_id,
          status = 'active',
          enrolled_by = EXCLUDED.enrolled_by,
          updated_at = NOW()
        RETURNING *
      `,
      [input.tenant_id, input.teacher_user_id, input.biometric_hash, input.enrolled_by],
    );
  }

  async registerEvent(input: Record<string, unknown>) {
    const result = await this.databaseService.query(
      `
        INSERT INTO biometric_events (
          tenant_id, device_id, biometric_hash, event_hash, occurred_at,
          event_type, offline_mode_flag, raw_payload
        )
        VALUES ($1, $2::uuid, $3, $4, $5::timestamptz, $6, $7, $8::jsonb)
        ON CONFLICT (tenant_id, event_hash)
        DO UPDATE SET processing_status = 'duplicate', updated_at = NOW()
        RETURNING id::text, device_id::text, biometric_hash, event_hash, event_type,
                  occurred_at::text, processing_status = 'duplicate' AS duplicate
      `,
      [
        input.tenant_id,
        input.device_id,
        input.biometric_hash,
        input.event_hash,
        input.timestamp,
        input.event_type,
        input.offline_mode_flag ?? false,
        JSON.stringify(input.raw_payload ?? {}),
      ],
    );

    return result.rows[0];
  }

  async findIdentityByHash(input: { tenant_id: string; biometric_hash: string }) {
    const result = await this.databaseService.query(
      `
        SELECT teacher_user_id::text
        FROM biometric_identities
        WHERE tenant_id = $1
          AND biometric_hash = $2
          AND status = 'active'
        LIMIT 1
      `,
      [input.tenant_id, input.biometric_hash],
    );

    return result.rows[0] ?? null;
  }

  async getAttendanceRule(tenantId: string) {
    const result = await this.databaseService.query(
      `
        INSERT INTO attendance_rules (tenant_id)
        VALUES ($1)
        ON CONFLICT (tenant_id)
        DO UPDATE SET updated_at = attendance_rules.updated_at
        RETURNING
          default_start_time::text,
          grace_period_minutes,
          absence_cutoff_time::text,
          half_day_checkout_cutoff::text
      `,
      [tenantId],
    );

    return result.rows[0];
  }

  appendTeacherAttendanceLog(input: Record<string, unknown>) {
    return this.insertReturning(
      `
        INSERT INTO teacher_attendance_logs (
          tenant_id,
          teacher_user_id,
          attendance_date,
          event_id,
          event_type,
          occurred_at,
          device_id,
          status,
          rule_snapshot,
          manual_override,
          override_reason,
          override_by
        )
        VALUES ($1, $2::uuid, $3::date, $4::uuid, $5, $6::timestamptz, $7::uuid, $8, $9::jsonb, $10, $11, $12::uuid)
        RETURNING *
      `,
      [
        input.tenant_id,
        input.teacher_user_id,
        input.attendance_date,
        input.event_id ?? null,
        input.event_type,
        input.occurred_at,
        input.device_id ?? null,
        input.status,
        JSON.stringify(input.rule_snapshot ?? {}),
        input.manual_override ?? false,
        input.override_reason ?? null,
        input.override_by ?? null,
      ],
    );
  }

  async markEventProcessed(input: { tenant_id: string; event_id: string; status: string }) {
    await this.databaseService.query(
      `
        UPDATE biometric_events
        SET processing_status = $3, updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
      `,
      [input.tenant_id, input.event_id, input.status],
    );
  }

  async listTeacherLogs(input: {
    tenant_id: string;
    teacher_user_id?: string;
    limit?: number;
    offset?: number;
  }) {
    const limit = this.normalizeLimit(input.limit);
    const offset = this.normalizeOffset(input.offset);
    const result = await this.databaseService.query(
      `
        SELECT
          id::text,
          tenant_id,
          teacher_user_id::text,
          attendance_date::text,
          event_id::text,
          event_type,
          occurred_at::text,
          device_id::text,
          status,
          rule_snapshot,
          manual_override,
          override_reason,
          override_by::text,
          created_at::text,
          updated_at::text
        FROM teacher_attendance_logs
        WHERE tenant_id = $1
          AND ($2::uuid IS NULL OR teacher_user_id = $2::uuid)
        ORDER BY attendance_date DESC, created_at DESC
        LIMIT $3::integer
        OFFSET $4::integer
      `,
      [input.tenant_id, input.teacher_user_id ?? null, limit, offset],
    );

    return result.rows;
  }

  async listLiveFeed(input: { tenant_id: string; limit?: number; offset?: number }) {
    const limit = this.normalizeLimit(input.limit);
    const offset = this.normalizeOffset(input.offset);
    const result = await this.databaseService.query(
      `
        SELECT
          log.id::text,
          log.tenant_id,
          log.teacher_user_id::text,
          users.display_name AS teacher_name,
          log.attendance_date::text,
          log.event_type,
          log.occurred_at::text,
          log.status,
          log.manual_override,
          log.device_id::text,
          device.name AS device_name,
          device.location AS device_location,
          log.created_at::text
        FROM teacher_attendance_logs log
        LEFT JOIN users
          ON users.id = log.teacher_user_id
        LEFT JOIN biometric_devices device
          ON device.tenant_id = log.tenant_id
         AND device.id = log.device_id
        WHERE log.tenant_id = $1
        ORDER BY log.created_at DESC
        LIMIT $2::integer
        OFFSET $3::integer
      `,
      [input.tenant_id, limit, offset],
    );

    return result.rows;
  }

  async getMonthlyReport(input: { tenant_id: string; month: string }) {
    const result = await this.databaseService.query(
      `
        WITH latest_daily_status AS (
          SELECT DISTINCT ON (teacher_user_id, attendance_date)
            teacher_user_id,
            attendance_date,
            status
          FROM teacher_attendance_logs
          WHERE tenant_id = $1
            AND attendance_date >= ($2 || '-01')::date
            AND attendance_date < (($2 || '-01')::date + INTERVAL '1 month')
          ORDER BY teacher_user_id, attendance_date, created_at DESC
        )
        SELECT status, COUNT(*)::integer AS total
        FROM latest_daily_status
        GROUP BY status
        ORDER BY status
      `,
      [input.tenant_id, input.month],
    );

    return result.rows;
  }

  async applyDailyAttendanceRules(input: {
    attendance_date: string;
    absence_cutoff_time?: string | null;
  }) {
    const result = await this.databaseService.query<{
      absent_marked: string;
      half_day_marked: string;
    }>(
      `
        WITH active_teachers AS (
          SELECT
            memberships.tenant_id,
            memberships.user_id AS teacher_user_id
          FROM tenant_memberships memberships
          INNER JOIN roles
            ON roles.tenant_id = memberships.tenant_id
           AND roles.id = memberships.role_id
          WHERE memberships.status = 'active'
            AND roles.code IN ('teacher', 'staff', 'staff_teacher')
        ),
        rules AS (
          SELECT
            active_teachers.tenant_id,
            active_teachers.teacher_user_id,
            COALESCE(attendance_rules.default_start_time, '07:30'::time) AS default_start_time,
            COALESCE(attendance_rules.grace_period_minutes, 10) AS grace_period_minutes,
            COALESCE($2::time, attendance_rules.absence_cutoff_time, '09:00'::time) AS absence_cutoff_time,
            COALESCE(attendance_rules.half_day_checkout_cutoff, '12:30'::time) AS half_day_checkout_cutoff
          FROM active_teachers
          LEFT JOIN attendance_rules
            ON attendance_rules.tenant_id = active_teachers.tenant_id
           AND attendance_rules.is_active = true
        ),
        absent_inserted AS (
          INSERT INTO teacher_attendance_logs (
            tenant_id,
            teacher_user_id,
            attendance_date,
            event_type,
            occurred_at,
            status,
            rule_snapshot
          )
          SELECT
            rules.tenant_id,
            rules.teacher_user_id,
            $1::date,
            'absence_mark',
            NOW(),
            'absent',
            jsonb_build_object(
              'default_start_time', rules.default_start_time::text,
              'grace_period_minutes', rules.grace_period_minutes,
              'absence_cutoff_time', rules.absence_cutoff_time::text,
              'half_day_checkout_cutoff', rules.half_day_checkout_cutoff::text,
              'source', 'biometric_attendance_rule_worker'
            )
          FROM rules
          WHERE rules.absence_cutoff_time <= LOCALTIME
            AND NOT EXISTS (
              SELECT 1
              FROM teacher_attendance_logs existing
              WHERE existing.tenant_id = rules.tenant_id
                AND existing.teacher_user_id = rules.teacher_user_id
                AND existing.attendance_date = $1::date
                AND existing.status IN ('present', 'late', 'absent', 'half_day', 'excused', 'manual_override')
            )
          RETURNING 1
        ),
        half_day_inserted AS (
          INSERT INTO teacher_attendance_logs (
            tenant_id,
            teacher_user_id,
            attendance_date,
            event_type,
            occurred_at,
            status,
            rule_snapshot
          )
          SELECT DISTINCT ON (rules.tenant_id, rules.teacher_user_id)
            rules.tenant_id,
            rules.teacher_user_id,
            $1::date,
            'absence_mark',
            NOW(),
            'half_day',
            jsonb_build_object(
              'default_start_time', rules.default_start_time::text,
              'grace_period_minutes', rules.grace_period_minutes,
              'absence_cutoff_time', rules.absence_cutoff_time::text,
              'half_day_checkout_cutoff', rules.half_day_checkout_cutoff::text,
              'source', 'biometric_attendance_rule_worker'
            )
          FROM rules
          INNER JOIN teacher_attendance_logs check_in
            ON check_in.tenant_id = rules.tenant_id
           AND check_in.teacher_user_id = rules.teacher_user_id
           AND check_in.attendance_date = $1::date
           AND check_in.event_type = 'check_in'
           AND check_in.status IN ('present', 'late')
          WHERE rules.half_day_checkout_cutoff <= LOCALTIME
            AND NOT EXISTS (
              SELECT 1
              FROM teacher_attendance_logs check_out
              WHERE check_out.tenant_id = rules.tenant_id
                AND check_out.teacher_user_id = rules.teacher_user_id
                AND check_out.attendance_date = $1::date
                AND check_out.event_type = 'check_out'
            )
            AND NOT EXISTS (
              SELECT 1
              FROM teacher_attendance_logs existing
              WHERE existing.tenant_id = rules.tenant_id
                AND existing.teacher_user_id = rules.teacher_user_id
                AND existing.attendance_date = $1::date
                AND existing.status IN ('half_day', 'absent', 'excused', 'manual_override')
            )
          ORDER BY rules.tenant_id, rules.teacher_user_id
          RETURNING 1
        )
        SELECT
          (SELECT COUNT(*)::text FROM absent_inserted) AS absent_marked,
          (SELECT COUNT(*)::text FROM half_day_inserted) AS half_day_marked
      `,
      [input.attendance_date, input.absence_cutoff_time ?? null],
    );

    return {
      absent_marked: Number(result.rows[0]?.absent_marked ?? 0),
      half_day_marked: Number(result.rows[0]?.half_day_marked ?? 0),
    };
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

  private normalizeLimit(value: number | undefined): number {
    const candidate = Number(value);

    if (!Number.isInteger(candidate) || candidate < 1) {
      return 25;
    }

    return Math.min(candidate, 50);
  }

  private normalizeOffset(value: number | undefined): number {
    const candidate = Number(value);

    if (!Number.isInteger(candidate) || candidate < 0) {
      return 0;
    }

    return candidate;
  }
}
