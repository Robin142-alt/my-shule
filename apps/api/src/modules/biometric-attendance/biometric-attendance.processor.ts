import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { RequestContextService } from '../../common/request-context/request-context.service';
import { BiometricAttendanceRepository } from './repositories/biometric-attendance.repository';

export interface DailyAttendanceRuleCheckInput {
  attendanceDate?: string;
  absenceCutoffTime?: string;
}

@Injectable()
export class BiometricAttendanceProcessor implements OnModuleInit, OnModuleDestroy {
  readonly queueName = 'biometric-attendance';
  private readonly logger = new Logger(BiometricAttendanceProcessor.name);
  private ruleTimer: ReturnType<typeof setInterval> | null = null;
  private tickInProgress = false;

  constructor(
    private readonly repository: BiometricAttendanceRepository,
    @Optional() private readonly configService?: ConfigService,
    @Optional() private readonly requestContext?: RequestContextService,
  ) {}

  onModuleInit(): void {
    if (!this.isRuleWorkerEnabled()) {
      return;
    }

    const intervalMs = this.getRuleWorkerIntervalMs();
    this.ruleTimer = setInterval(() => {
      void this.runDailyAttendanceRuleCheck();
    }, intervalMs);
    this.ruleTimer.unref?.();
    this.logger.log(`Biometric attendance rule worker running every ${intervalMs}ms`);
  }

  onModuleDestroy(): void {
    if (this.ruleTimer) {
      clearInterval(this.ruleTimer);
      this.ruleTimer = null;
    }
  }

  async runDailyAttendanceRuleCheck(input: DailyAttendanceRuleCheckInput = {}) {
    if (this.tickInProgress) {
      return {
        attendance_date: this.resolveAttendanceDate(input.attendanceDate),
        absent_marked: 0,
        half_day_marked: 0,
      };
    }

    return this.runWithSystemContext('/internal/biometric-attendance/rule-check', async () => {
      const attendanceDate = this.resolveAttendanceDate(input.attendanceDate);
      this.tickInProgress = true;

      try {
        const result = await this.repository.applyDailyAttendanceRules({
          attendance_date: attendanceDate,
          absence_cutoff_time: input.absenceCutoffTime?.trim() || null,
        });

        return {
          attendance_date: attendanceDate,
          absent_marked: Number(result.absent_marked ?? 0),
          half_day_marked: Number(result.half_day_marked ?? 0),
        };
      } finally {
        this.tickInProgress = false;
      }
    });
  }

  private resolveAttendanceDate(value?: string): string {
    const normalized = value?.trim();

    if (normalized) {
      return normalized;
    }

    return new Date().toISOString().slice(0, 10);
  }

  private isRuleWorkerEnabled(): boolean {
    return this.configService?.get<boolean>('biometricAttendance.ruleWorkerEnabled') ?? false;
  }

  private getRuleWorkerIntervalMs(): number {
    const configured = Number(
      this.configService?.get<number | string>('biometricAttendance.ruleWorkerIntervalMs') ?? 5 * 60_000,
    );

    if (!Number.isFinite(configured)) {
      return 5 * 60_000;
    }

    return Math.min(Math.max(Math.floor(configured), 60_000), 24 * 60 * 60_000);
  }

  private runWithSystemContext<T>(path: string, callback: () => Promise<T>): Promise<T> {
    if (!this.requestContext || this.requestContext.getStore()) {
      return callback();
    }

    return this.requestContext.run(
      {
        request_id: `biometric-attendance-rule-check:${Date.now()}`,
        tenant_id: null,
        user_id: 'system',
        role: 'system',
        session_id: null,
        permissions: ['teacher_attendance:read', 'teacher_attendance:write'],
        is_authenticated: false,
        client_ip: null,
        user_agent: 'system:biometric-attendance-rule-worker',
        method: 'BACKGROUND',
        path,
        started_at: new Date().toISOString(),
      },
      callback,
    );
  }
}
