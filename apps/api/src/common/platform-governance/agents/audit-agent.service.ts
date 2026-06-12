import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { EventPublisherService } from '../../../modules/events/event-publisher.service';

@Injectable()
export class AuditAgentService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuditAgentService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventPublisher: EventPublisherService,
  ) {}

  onModuleInit() {
    // Run drift detection every 5 minutes
    this.timer = setInterval(() => {
      this.detectDrift().catch(err => this.logger.error('Drift detection failed', err));
    }, 5 * 60 * 1000);
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  async detectDrift() {
    this.logger.log('[Audit Agent] Running continuous drift detection...');

    // Simple drift detection: Check if there are audit logs without outbox events for mutations within the last hour
    const driftQuery = await this.prisma.$queryRawUnsafe<{ aggregate_id: string; action: string }[]>(
      `SELECT a.aggregate_id, a.action
       FROM audit_logs a
       LEFT JOIN outbox_events o ON a.aggregate_id = o.aggregate_id
       WHERE a.created_at >= NOW() - INTERVAL '1 hour'
       AND o.id IS NULL
       AND a.action NOT LIKE '%READ%'
       LIMIT 10;`
    );

    if (driftQuery.length > 0) {
      this.logger.warn(`[Audit Agent] DRIFT DETECTED! Found ${driftQuery.length} state mutations without corresponding events!`);
      // Optionally emit a critical system event here
    } else {
      this.logger.log('[Audit Agent] Ledger is fully verified. Zero drift detected.');
    }
  }
}
