import { randomUUID } from 'node:crypto';

import { Injectable, Optional, UnauthorizedException } from '@nestjs/common';

import { RequestContextService } from '../../common/request-context/request-context.service';
import { DatabaseService } from '../../database/database.service';
import {
  AttendanceRecordEntity,
  AttendanceRecordsRepository,
} from '../sync/repositories/attendance-records.repository';
import { SyncOperationLogService } from '../sync/sync-operation-log.service';
import { AttendanceSyncPayload } from '../sync/sync.types';

interface UpsertStudentAttendanceInput {
  status: AttendanceSyncPayload['status'];
  last_modified_at?: string;
  notes?: string | null;
  metadata?: Record<string, unknown>;
}

interface ListStudentAttendanceInput {
  from_date?: string;
  to_date?: string;
  limit?: number;
}

@Injectable()
export class AttendanceService {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly databaseService: DatabaseService,
    private readonly attendanceRecordsRepository: AttendanceRecordsRepository,
    @Optional() private readonly syncOperationLogService?: SyncOperationLogService,
  ) {}

  async upsertStudentAttendance(
    studentId: string,
    attendanceDate: string,
    input: UpsertStudentAttendanceInput,
  ): Promise<AttendanceRecordEntity> {
    return this.databaseService.withRequestTransaction(async () => {
      const tenantId = this.requireTenantId();
      const lastModifiedAt = new Date(input.last_modified_at ?? new Date().toISOString());

      if (Number.isNaN(lastModifiedAt.getTime())) {
        throw new Error('Invalid attendance last_modified_at value');
      }

      const payload: AttendanceSyncPayload = {
        action: 'upsert',
        record_id: randomUUID(),
        student_id: studentId,
        attendance_date: attendanceDate,
        status: input.status,
        last_modified_at: lastModifiedAt.toISOString(),
        notes: input.notes ?? null,
        metadata: input.metadata ?? {},
      };
      const operationLog = this.syncOperationLogService
        ? await this.syncOperationLogService.recordServerOperation('attendance', payload, tenantId)
        : null;

      return this.attendanceRecordsRepository.upsert({
        tenant_id: tenantId,
        record_id: payload.record_id,
        student_id: payload.student_id,
        attendance_date: payload.attendance_date,
        status: payload.status,
        notes: payload.notes,
        metadata: payload.metadata,
        source_device_id: 'server',
        last_operation_id: operationLog?.op_id ?? null,
        sync_version: operationLog?.version ?? null,
        last_modified_at: payload.last_modified_at,
      });
    });
  }

  async listStudentAttendance(
    studentId: string,
    input: ListStudentAttendanceInput = {},
  ): Promise<AttendanceRecordEntity[]> {
    return this.attendanceRecordsRepository.listByStudent(
      this.requireTenantId(),
      studentId,
      input,
    );
  }

  private requireTenantId(): string {
    const tenantId = this.requestContext.getStore()?.tenant_id;

    if (!tenantId) {
      throw new UnauthorizedException('Tenant context is required for attendance records');
    }

    return tenantId;
  }
}
