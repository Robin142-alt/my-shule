import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';

import { RequestContextService } from '../../common/request-context/request-context.service';
import {
  EnrollBiometricIdentityDto,
  ManualTeacherAttendanceOverrideDto,
  RegisterBiometricDeviceDto,
  SyncBiometricEventsDto,
} from './dto/biometric-attendance.dto';
import { BiometricAttendanceRepository } from './repositories/biometric-attendance.repository';

type AttendanceRule = {
  default_start_time: string;
  grace_period_minutes: number;
  absence_cutoff_time: string;
  half_day_checkout_cutoff: string;
};

@Injectable()
export class BiometricAttendanceService {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly repository: BiometricAttendanceRepository,
  ) {}

  async registerDevice(dto: RegisterBiometricDeviceDto) {
    const device = await this.repository.registerDevice({
      tenant_id: this.requireTenantId(),
      name: this.requireText(dto.name, 'Device name'),
      location: this.requireText(dto.location, 'Device location'),
      type: this.requireText(dto.type, 'Device type'),
      registered_by: this.requireUserId(),
    });
    await this.audit('teacher_attendance.device_registered', 'biometric_device', device?.id, dto);

    return device;
  }

  async enrollIdentity(dto: EnrollBiometricIdentityDto) {
    const identity = await this.repository.enrollIdentity({
      tenant_id: this.requireTenantId(),
      teacher_user_id: this.requireText(dto.teacher_user_id, 'Teacher'),
      biometric_hash: this.requireText(dto.biometric_hash, 'Biometric hash'),
      enrolled_by: this.requireUserId(),
    });
    await this.audit('teacher_attendance.identity_enrolled', 'biometric_identity', identity?.id, {});

    return identity;
  }

  async syncEvents(dto: SyncBiometricEventsDto) {
    const tenantId = this.requireTenantId();
    let accepted = 0;
    let duplicates = 0;
    let unmatched = 0;

    const rule = await this.repository.getAttendanceRule(tenantId) as AttendanceRule;

    await Promise.all((dto.events ?? []).map(async (event) => {
      const registeredEvent = await this.repository.registerEvent({
        tenant_id: tenantId,
        device_id: this.requireText(dto.device_id, 'Device'),
        event_hash: this.requireText(event.event_hash, 'Event hash'),
        biometric_hash: this.requireText(event.biometric_hash, 'Biometric hash'),
        timestamp: this.requireText(event.timestamp, 'Event timestamp'),
        event_type: this.requireEventType(event.event_type),
        offline_mode_flag: event.offline_mode_flag ?? false,
        raw_payload: event.raw_payload ?? {},
      });

      if (registeredEvent.duplicate) {
        duplicates += 1;
        return;
      }

      const identity = await this.repository.findIdentityByHash({
        tenant_id: tenantId,
        biometric_hash: String(registeredEvent.biometric_hash),
      });

      if (!identity) {
        unmatched += 1;
        await this.repository.markEventProcessed({
          tenant_id: tenantId,
          event_id: String(registeredEvent.id),
          status: 'unmatched',
        });
        return;
      }

      const occurredAt = new Date(String(registeredEvent.occurred_at));
      await this.repository.appendTeacherAttendanceLog({
        tenant_id: tenantId,
        teacher_user_id: identity.teacher_user_id,
        attendance_date: occurredAt.toISOString().slice(0, 10),
        event_id: registeredEvent.id,
        event_type: registeredEvent.event_type,
        occurred_at: occurredAt.toISOString(),
        device_id: registeredEvent.device_id,
        status: this.evaluateTeacherAttendanceStatus({
          eventType: registeredEvent.event_type,
          occurredAt,
          rule,
        }),
        rule_snapshot: rule,
      });
      await this.repository.markEventProcessed({
        tenant_id: tenantId,
        event_id: String(registeredEvent.id),
        status: 'processed',
      });
      accepted += 1;
    }));

    await this.audit('teacher_attendance.event_synced', 'biometric_event', undefined, {
      accepted,
      duplicates,
      unmatched,
    });

    return { accepted, duplicates, unmatched };
  }

  async createManualOverride(dto: ManualTeacherAttendanceOverrideDto) {
    if ((dto.reason?.trim() ?? '').length < 12) {
      throw new BadRequestException('Manual override reason must be at least 12 characters');
    }

    const log = await this.repository.appendTeacherAttendanceLog({
      tenant_id: this.requireTenantId(),
      teacher_user_id: this.requireText(dto.teacher_user_id, 'Teacher'),
      attendance_date: this.requireText(dto.attendance_date, 'Attendance date'),
      event_type: 'manual_override',
      occurred_at: new Date().toISOString(),
      status: this.requireOverrideStatus(dto.status),
      rule_snapshot: {},
      manual_override: true,
      override_reason: dto.reason.trim(),
      override_by: this.requireUserId(),
    });
    await this.audit('teacher_attendance.manual_override_created', 'teacher_attendance_log', log?.id, {
      teacher_user_id: dto.teacher_user_id,
      attendance_date: dto.attendance_date,
      status: dto.status,
    });

    return log;
  }

  listTeacherLogs(
    teacherUserId?: string,
    limit?: string | number,
    offset?: string | number,
  ) {
    return this.repository.listTeacherLogs({
      tenant_id: this.requireTenantId(),
      teacher_user_id: teacherUserId?.trim() || undefined,
      limit: this.resolveLimit(limit, 25, 1, 50),
      offset: this.resolveOffset(offset),
    });
  }

  listLiveFeed(limit?: string | number, offset?: string | number) {
    return this.repository.listLiveFeed({
      tenant_id: this.requireTenantId(),
      limit: this.resolveLimit(limit, 25, 1, 50),
      offset: this.resolveOffset(offset),
    });
  }

  async getMonthlyReport(month?: string) {
    const reportMonth = this.resolveReportMonth(month);
    const rows = await this.repository.getMonthlyReport({
      tenant_id: this.requireTenantId(),
      month: reportMonth,
    });
    const summary = {
      present: 0,
      late: 0,
      absent: 0,
      half_day: 0,
      excused: 0,
      manual_override: 0,
    };

    for (const row of rows as Array<{ status: keyof typeof summary; total: string | number }>) {
      if (row.status in summary) {
        summary[row.status] = Number(row.total ?? 0);
      }
    }

    return {
      month: reportMonth,
      summary,
      rows,
    };
  }

  private evaluateTeacherAttendanceStatus(input: {
    eventType: 'check_in' | 'check_out';
    occurredAt: Date;
    rule: AttendanceRule;
  }) {
    if (input.eventType === 'check_out') {
      return 'present';
    }

    const threshold = new Date(input.occurredAt);
    const [hours, minutes] = input.rule.default_start_time.split(':').map(Number);
    threshold.setHours(hours ?? 7, minutes ?? 30, 0, 0);
    threshold.setMinutes(threshold.getMinutes() + Number(input.rule.grace_period_minutes ?? 10));

    return input.occurredAt > threshold ? 'late' : 'present';
  }

  private async audit(
    action: string,
    entityType: string,
    entityId: string | undefined,
    metadata: unknown,
  ) {
    await this.repository.appendAuditLog({
      tenant_id: this.requireTenantId(),
      actor_user_id: this.currentUserId(),
      action,
      entity_type: entityType,
      entity_id: entityId ?? null,
      metadata: metadata && typeof metadata === 'object' ? metadata : {},
    });
  }

  private requireTenantId(): string {
    const tenantId = this.requestContext.getStore()?.tenant_id;

    if (!tenantId) {
      throw new UnauthorizedException('Tenant context is required for teacher biometric attendance');
    }

    return tenantId;
  }

  private requireUserId(): string {
    const userId = this.currentUserId();

    if (!userId) {
      throw new UnauthorizedException('Authenticated user is required for teacher biometric attendance');
    }

    return userId;
  }

  private currentUserId(): string | null {
    return this.requestContext.getStore()?.user_id ?? null;
  }

  private requireText(value: string | undefined, fieldName: string): string {
    const normalized = value?.trim() ?? '';

    if (!normalized) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    return normalized;
  }

  private requireEventType(value: string): 'check_in' | 'check_out' {
    if (value === 'check_in' || value === 'check_out') {
      return value;
    }

    throw new BadRequestException('Biometric event type is invalid');
  }

  private requireOverrideStatus(value: string) {
    if (['present', 'late', 'absent', 'half_day', 'excused', 'manual_override'].includes(value)) {
      return value;
    }

    throw new BadRequestException('Manual override status is invalid');
  }

  private resolveLimit(
    value: string | number | undefined,
    fallback: number,
    minimum: number,
    maximum: number,
  ): number {
    const parsed = Number(value ?? fallback);

    if (!Number.isFinite(parsed)) {
      return fallback;
    }

    return Math.min(Math.max(Math.floor(parsed), minimum), maximum);
  }

  private resolveOffset(value: string | number | undefined): number {
    const parsed = Number(value ?? 0);

    if (!Number.isFinite(parsed)) {
      return 0;
    }

    return Math.max(Math.floor(parsed), 0);
  }

  private resolveReportMonth(value?: string): string {
    const normalized = value?.trim();

    if (!normalized) {
      return new Date().toISOString().slice(0, 7);
    }

    if (/^\d{4}-\d{2}$/.test(normalized)) {
      return normalized;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      return normalized.slice(0, 7);
    }

    throw new BadRequestException('Monthly attendance report must use YYYY-MM');
  }
}
