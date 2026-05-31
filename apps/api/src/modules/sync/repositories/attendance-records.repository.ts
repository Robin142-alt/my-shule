import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../../database/database.service';
import { AttendanceSyncPayload } from '../sync.types';

export interface AttendanceRecordEntity {
  id: string;
  tenant_id: string;
  student_id: string;
  attendance_date: string;
  status: AttendanceSyncPayload['status'];
  notes: string | null;
  metadata: Record<string, unknown>;
  source_device_id: string | null;
  last_operation_id: string | null;
  sync_version: string | null;
  last_modified_at: Date;
  created_at: Date;
  updated_at: Date;
}

interface AttendanceRecordRow extends Omit<AttendanceRecordEntity, 'metadata'> {
  metadata: Record<string, unknown> | null;
}

export interface UpsertAttendanceRecordInput {
  tenant_id: string;
  record_id: string;
  student_id: string;
  attendance_date: string;
  status: AttendanceSyncPayload['status'];
  notes?: string | null;
  metadata?: Record<string, unknown>;
  source_device_id: string;
  last_operation_id?: string | null;
  sync_version?: string | null;
  last_modified_at: string;
}

@Injectable()
export class AttendanceRecordsRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findByStudentDate(
    tenantId: string,
    studentId: string,
    attendanceDate: string,
  ): Promise<AttendanceRecordEntity | null> {
    const result = await this.databaseService.query<AttendanceRecordRow>(
      `
        SELECT
          id,
          tenant_id,
          student_id,
          attendance_date::text,
          status,
          notes,
          metadata,
          source_device_id,
          last_operation_id::text,
          sync_version::text,
          last_modified_at,
          created_at,
          updated_at
        FROM attendance_records
        WHERE tenant_id = $1
          AND student_id = $2::uuid
          AND attendance_date = $3::date
        LIMIT 1
      `,
      [tenantId, studentId, attendanceDate],
    );

    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async upsert(input: UpsertAttendanceRecordInput): Promise<AttendanceRecordEntity> {
    const result = await this.databaseService.query<AttendanceRecordRow>(
      `
        INSERT INTO attendance_records (
          id,
          tenant_id,
          student_id,
          attendance_date,
          status,
          notes,
          metadata,
          source_device_id,
          last_modified_at,
          last_operation_id,
          sync_version
        )
        VALUES (
          $1::uuid,
          $2,
          $3::uuid,
          $4::date,
          $5,
          $6,
          $7::jsonb,
          $8,
          $9::timestamptz,
          $10::uuid,
          $11::bigint
        )
        ON CONFLICT (tenant_id, student_id, attendance_date)
        DO UPDATE SET
          status = EXCLUDED.status,
          notes = EXCLUDED.notes,
          metadata = EXCLUDED.metadata,
          source_device_id = EXCLUDED.source_device_id,
          last_modified_at = EXCLUDED.last_modified_at,
          last_operation_id = EXCLUDED.last_operation_id,
          sync_version = EXCLUDED.sync_version
        RETURNING
          id,
          tenant_id,
          student_id,
          attendance_date::text,
          status,
          notes,
          metadata,
          source_device_id,
          last_operation_id::text,
          sync_version::text,
          last_modified_at,
          created_at,
          updated_at
      `,
      [
        input.record_id,
        input.tenant_id,
        input.student_id,
        input.attendance_date,
        input.status,
        input.notes ?? null,
        JSON.stringify(input.metadata ?? {}),
        input.source_device_id,
        input.last_modified_at,
        input.last_operation_id ?? null,
        input.sync_version ?? null,
      ],
    );

    return this.mapRow(result.rows[0]);
  }

  async listByStudent(
    tenantId: string,
    studentId: string,
    options: {
      from_date?: string;
      to_date?: string;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<AttendanceRecordEntity[]> {
    const limit = this.normalizeLimit(options.limit);
    const offset = this.normalizeOffset(options.offset);
    const result = await this.databaseService.query<AttendanceRecordRow>(
      `
        SELECT
          id,
          tenant_id,
          student_id,
          attendance_date::text,
          status,
          notes,
          metadata,
          source_device_id,
          last_operation_id::text,
          sync_version::text,
          last_modified_at,
          created_at,
          updated_at
        FROM attendance_records
        WHERE tenant_id = $1
          AND student_id = $2::uuid
          AND ($3::date IS NULL OR attendance_date >= $3::date)
          AND ($4::date IS NULL OR attendance_date <= $4::date)
        ORDER BY attendance_date DESC
        LIMIT $5::integer
        OFFSET $6::integer
      `,
      [
        tenantId,
        studentId,
        options.from_date ?? null,
        options.to_date ?? null,
        limit,
        offset,
      ],
    );

    return result.rows.map((row) => this.mapRow(row));
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

  private mapRow(row: AttendanceRecordRow): AttendanceRecordEntity {
    return {
      ...row,
      metadata: row.metadata ?? {},
    };
  }
}
