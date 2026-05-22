import { BadRequestException, Injectable } from '@nestjs/common';

import {
  AttendanceRecordEntity,
  AttendanceRecordsRepository,
} from '../repositories/attendance-records.repository';
import { SyncOperationLogsRepository } from '../repositories/sync-operation-logs.repository';
import {
  AttendanceSyncPayload,
  SyncPushOperationInput,
  SyncPushOperationResult,
} from '../sync.types';

@Injectable()
export class AttendanceSyncConflictResolverService {
  constructor(
    private readonly attendanceRecordsRepository: AttendanceRecordsRepository,
    private readonly syncOperationLogsRepository: SyncOperationLogsRepository,
  ) {}

  async applyOperation(
    tenantId: string,
    deviceId: string,
    operation: SyncPushOperationInput<'attendance'>,
  ): Promise<SyncPushOperationResult<'attendance'>> {
    const payload = this.normalizePayload(operation.payload);
    const existingRecord = await this.attendanceRecordsRepository.findByStudentDate(
      tenantId,
      payload.student_id,
      payload.attendance_date,
    );

    if (existingRecord && !this.shouldReplace(existingRecord, payload, operation.op_id)) {
      return {
        op_id: operation.op_id,
        entity: operation.entity,
        status: 'rejected',
        client_version: operation.version,
        server_version: existingRecord.sync_version,
        reason: 'A newer attendance edit already exists on the server',
        conflict_policy: 'last-write-wins',
        server_state: this.toServerState(existingRecord),
      };
    }

    const operationLog = await this.syncOperationLogsRepository.createOperation({
      op_id: operation.op_id,
      tenant_id: tenantId,
      device_id: deviceId,
      entity: 'attendance',
      payload,
    });
    const record = await this.attendanceRecordsRepository.upsert({
      tenant_id: tenantId,
      record_id: payload.record_id,
      student_id: payload.student_id,
      attendance_date: payload.attendance_date,
      status: payload.status,
      notes: payload.notes ?? null,
      metadata: payload.metadata ?? {},
      source_device_id: deviceId,
      last_operation_id: operationLog.op_id,
      sync_version: operationLog.version,
      last_modified_at: payload.last_modified_at,
    });

    return {
      op_id: operation.op_id,
      entity: operation.entity,
      status: 'applied',
      client_version: operation.version,
      server_version: operationLog.version,
      reason: null,
      conflict_policy: 'last-write-wins',
      server_state: this.toServerState(record),
    };
  }

  private normalizePayload(payload: AttendanceSyncPayload): AttendanceSyncPayload {
    if (payload.action !== 'upsert') {
      throw new BadRequestException('Unsupported attendance sync action');
    }

    if (!payload.record_id || !payload.student_id || !payload.attendance_date) {
      throw new BadRequestException('Attendance sync payload is missing required identifiers');
    }

    if (!['present', 'absent', 'late', 'excused'].includes(payload.status)) {
      throw new BadRequestException('Attendance sync payload has an invalid status');
    }

    const modifiedAt = new Date(payload.last_modified_at);

    if (Number.isNaN(modifiedAt.getTime())) {
      throw new BadRequestException('Attendance sync payload has an invalid last_modified_at value');
    }

    return {
      action: 'upsert',
      record_id: payload.record_id,
      student_id: payload.student_id,
      attendance_date: payload.attendance_date,
      status: payload.status,
      last_modified_at: modifiedAt.toISOString(),
      notes: payload.notes ?? null,
      metadata: payload.metadata ?? {},
    };
  }

  private shouldReplace(
    existingRecord: AttendanceRecordEntity,
    incoming: AttendanceSyncPayload,
    incomingOperationId: string,
  ): boolean {
    const existingModifiedAt = existingRecord.last_modified_at.getTime();
    const incomingModifiedAt = new Date(incoming.last_modified_at).getTime();

    if (incomingModifiedAt > existingModifiedAt) {
      return true;
    }

    if (incomingModifiedAt < existingModifiedAt) {
      return false;
    }

    return incomingOperationId.localeCompare(existingRecord.last_operation_id ?? '') >= 0;
  }

  private toServerState(record: AttendanceRecordEntity): Record<string, unknown> {
    return {
      record_id: record.id,
      student_id: record.student_id,
      attendance_date: record.attendance_date,
      status: record.status,
      last_modified_at: record.last_modified_at.toISOString(),
      notes: record.notes,
      metadata: record.metadata,
      source_device_id: record.source_device_id,
      last_operation_id: record.last_operation_id,
      sync_version: record.sync_version,
    };
  }
}
