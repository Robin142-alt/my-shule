import { Injectable, Logger } from '@nestjs/common';
import { EventPublisherService } from '../../../modules/events/event-publisher.service';
import { AgpIntent } from '../agp-execution.interfaces';
import { SupportedDomainEventName } from '../../../modules/events/events.types';

@Injectable()
export class SelfHealingAgentService {
  private readonly logger = new Logger(SelfHealingAgentService.name);

  constructor(private readonly eventPublisher: EventPublisherService) {}

  async recover<TResult = any>(
    intent: AgpIntent<TResult>,
    error: any,
    tenantId: string,
    userId: string | null
  ): Promise<TResult> {
    this.logger.warn(`[Self-Healing Agent] Triage initiated for failed intent: ${intent.actionName}`);
    
    // Step 1 & 2: Emit Repair Triggered Event
    await this.emitSystemEvent('system.repair.triggered', intent, tenantId, error);

    // Step 3: Retry execution (simulate a single retry for transient issues like Prisma timeouts)
    const isTransient = error?.message?.includes('timeout') || error?.code === 'P2024';
    if (isTransient) {
      try {
        this.logger.log(`[Self-Healing Agent] Executing safe retry...`);
        const result = await intent.handler();
        this.logger.log(`[Self-Healing Agent] Retry succeeded!`);
        return result;
      } catch (retryError) {
        this.logger.warn(`[Self-Healing Agent] Retry failed.`);
      }
    }

    // Step 4 & 5: Attach fallback handler & Degrade Safely
    if (intent.fallback) {
      this.logger.log(`[Self-Healing Agent] Attaching fallback handler. Degrading safely.`);
      await this.emitSystemEvent('system.fallback.activated', intent, tenantId, error);
      return intent.fallback(error);
    }

    // If no fallback exists, we must not hide functionality completely, but we must throw a bounded error
    this.logger.error(`[Self-Healing Agent] No fallback handler available. Halting execution for ${intent.actionName}.`);
    throw error;
  }

  private async emitSystemEvent(
    eventName: SupportedDomainEventName,
    intent: AgpIntent<any>,
    tenantId: string,
    error: any
  ) {
    try {
      await this.eventPublisher.publish({
        tenant_id: tenantId,
        event_key: `${eventName}-${intent.aggregateId}-${Date.now()}`,
        event_name: eventName,
        aggregate_type: 'SYSTEM_AGENT',
        aggregate_id: intent.aggregateId,
        payload: {
          action: intent.actionName,
          error: error?.message || 'Unknown error',
        },
      });
    } catch (e) {
      this.logger.error(`Failed to publish system event ${eventName}`, e);
    }
  }
}
