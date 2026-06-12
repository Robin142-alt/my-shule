import { SelfHealingAgentService } from './agents/self-healing-agent.service';
import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { RequestContextService } from '../request-context/request-context.service';
import { EventPublisherService } from '../../modules/events/event-publisher.service';
import { AuditTrailService } from '../../modules/events/audit-trail.service';
import { AgpIntent } from './agp-execution.interfaces';
import { SupportedDomainEventName } from '../../modules/events/events.types';

@Injectable()
export class AgpExecutionService {
  private readonly logger = new Logger(AgpExecutionService.name);

  constructor(
    private readonly requestContext: RequestContextService,
    private readonly eventPublisher: EventPublisherService,
    private readonly auditTrail: AuditTrailService,
    private readonly selfHealingAgent: SelfHealingAgentService,
  ) {}

  async execute<TResult = any>(intent: AgpIntent<TResult>): Promise<TResult> {
    const context = this.requestContext.requireStore();
    const tenantId = context.tenant_id;
    const userId = context.user_id || null;

    if (!tenantId) {
      throw new ForbiddenException('AGP Validation Failed: Tenant Isolation Breach Attempted');
    }

    // 1. AGP Capability Resolution
    const hasCapability = context.permissions.includes('*:*') || context.permissions.includes(intent.requiredCapability);
    if (!hasCapability) {
      this.logger.warn(`AGP capability blocked: ${intent.requiredCapability} for user ${userId}`);
      throw new ForbiddenException(`AGP Validation Failed: Missing capability ${intent.requiredCapability}`);
    }

    try {
      // 2. Execution Dispatch
      this.logger.log(`AGP Dispatching intent: ${intent.actionName}`);
      const result = await intent.handler();

      // 3. Event Emission
      if (intent.eventName && intent.eventPayload) {
        await this.eventPublisher.publish({
          tenant_id: tenantId,
          event_key: `${intent.eventName}-${intent.aggregateId}-${Date.now()}`,
          event_name: intent.eventName as SupportedDomainEventName,
          aggregate_type: intent.aggregateType,
          aggregate_id: intent.aggregateId,
          payload: intent.eventPayload,
        });
      }

      // 4. Audit Logging
      await this.auditTrail.createAuditLog(
        tenantId,
        userId,
        intent.actionName,
        intent.aggregateType,
        intent.aggregateId,
        { status: 'SUCCESS' }
      );

      return result;

    } catch (error: any) {
      // 5. Self-Healing & Audit on Failure
      this.logger.error(`AGP Execution Rejected for ${intent.actionName}: ${error.message}`, error.stack);
      
      await this.auditTrail.createAuditLog(
        tenantId,
        userId,
        intent.actionName,
        intent.aggregateType,
        intent.aggregateId,
        { status: 'FAILED', error: error.message }
      );

      // Hand over to the Self-Healing Autonomous Agent
      return this.selfHealingAgent.recover(intent, error, tenantId, userId);
    }
  }
}
