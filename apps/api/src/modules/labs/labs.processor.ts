import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { RequestContextService } from '../../common/request-context/request-context.service';
import { LabsRepository } from './repositories/labs.repository';

export interface LabChemicalExpiryJobInput {
  nearExpiryDays?: number;
}

export interface LabEquipmentReconciliationJobInput {
  overdueHours?: number;
}

export interface LabMandatoryAttendanceDisciplineJobInput {
  lookbackDays?: number;
}

@Injectable()
export class LabsProcessor implements OnModuleInit, OnModuleDestroy {
  readonly queueName = 'labs-maintenance';
  private readonly logger = new Logger(LabsProcessor.name);
  private maintenanceTimer: ReturnType<typeof setInterval> | null = null;
  private tickInProgress = false;

  constructor(
    private readonly labsRepository: LabsRepository,
    @Optional() private readonly configService?: ConfigService,
    @Optional() private readonly requestContext?: RequestContextService,
  ) {}

  onModuleInit(): void {
    if (!this.isMaintenanceWorkerEnabled()) {
      return;
    }

    const intervalMs = this.getMaintenanceIntervalMs();
    this.maintenanceTimer = setInterval(() => {
      void this.runMaintenanceTick();
    }, intervalMs);
    this.maintenanceTimer.unref?.();
    this.logger.log(`Labs maintenance worker running every ${intervalMs}ms`);
  }

  onModuleDestroy(): void {
    if (this.maintenanceTimer) {
      clearInterval(this.maintenanceTimer);
      this.maintenanceTimer = null;
    }
  }

  async runMaintenanceTick() {
    if (this.tickInProgress) {
      return {
        skipped: true,
        reason: 'already_running',
      };
    }

    this.tickInProgress = true;

    try {
      const [chemicalExpiry, equipmentReconciliation, mandatoryAttendance] = await Promise.all([
        this.runChemicalExpiryCheck(),
        this.runEquipmentReconciliationCheck(),
        this.runMandatoryAttendanceDisciplineCheck(),
      ]);

      return {
        skipped: false,
        chemical_expiry: chemicalExpiry,
        equipment_reconciliation: equipmentReconciliation,
        mandatory_attendance: mandatoryAttendance,
      };
    } finally {
      this.tickInProgress = false;
    }
  }

  async runChemicalExpiryCheck(input: LabChemicalExpiryJobInput = {}) {
    return this.runWithSystemContext('/internal/labs/maintenance', async () => {
      const nearExpiryDays = this.requirePositiveInteger(input.nearExpiryDays ?? 30, 1, 365);
      const result = await this.labsRepository.refreshChemicalExpiryStatuses({
        near_expiry_days: nearExpiryDays,
      });

      return {
        expired: Number(result.expired ?? 0),
        near_expiry: Number(result.near_expiry ?? 0),
        near_expiry_days: nearExpiryDays,
      };
    });
  }

  async runEquipmentReconciliationCheck(input: LabEquipmentReconciliationJobInput = {}) {
    return this.runWithSystemContext('/internal/labs/maintenance', async () => {
      const overdueHours = this.requirePositiveInteger(input.overdueHours ?? 24, 1, 24 * 30);
      const result = await this.labsRepository.flagOverdueEquipmentUsage({
        overdue_hours: overdueHours,
      });

      return {
        unreconciled: Number(result.unreconciled ?? 0),
        overdue_hours: overdueHours,
      };
    });
  }

  async runMandatoryAttendanceDisciplineCheck(input: LabMandatoryAttendanceDisciplineJobInput = {}) {
    return this.runWithSystemContext('/internal/labs/maintenance', async () => {
      const lookbackDays = this.requirePositiveInteger(input.lookbackDays ?? 7, 1, 366);
      const result = await this.labsRepository.flagMandatoryAttendanceDisciplineGaps({
        lookback_days: lookbackDays,
      });

      return {
        auto_absent: Number(result.auto_absent ?? 0),
        behavior_events: Number(result.behavior_events ?? 0),
        participation_metrics: Number(result.participation_metrics ?? 0),
        lookback_days: lookbackDays,
      };
    });
  }

  private isMaintenanceWorkerEnabled(): boolean {
    return this.configService?.get<boolean>('labs.maintenanceWorkerEnabled') ?? false;
  }

  private getMaintenanceIntervalMs(): number {
    return this.getConfiguredInteger('labs.maintenanceWorkerIntervalMs', 15 * 60_000, 60_000, 24 * 60 * 60_000);
  }

  private getConfiguredInteger(
    key: string,
    fallback: number,
    minimum: number,
    maximum: number,
  ): number {
    return this.requirePositiveInteger(this.configService?.get<number | string>(key) ?? fallback, minimum, maximum);
  }

  private requirePositiveInteger(value: number | string, minimum: number, maximum: number): number {
    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
      return minimum;
    }

    return Math.min(Math.max(Math.floor(parsed), minimum), maximum);
  }

  private runWithSystemContext<T>(path: string, callback: () => Promise<T>): Promise<T> {
    if (!this.requestContext || this.requestContext.getStore()) {
      return callback();
    }

    return this.requestContext.run(
      {
        request_id: `labs-maintenance:${Date.now()}`,
        tenant_id: null,
        user_id: 'system',
        role: 'system',
        session_id: null,
        permissions: ['labs:inventory', 'labs:write'],
        is_authenticated: false,
        client_ip: null,
        user_agent: 'system:labs-maintenance-worker',
        method: 'BACKGROUND',
        path,
        started_at: new Date().toISOString(),
      },
      callback,
    );
  }
}
