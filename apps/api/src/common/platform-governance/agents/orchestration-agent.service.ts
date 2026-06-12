import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventConsumerRegistryService } from '../../../modules/events/event-consumer-registry.service';
import { DomainEvent, SupportedDomainEventName } from '../../../modules/events/events.types';

@Injectable()
export class OrchestrationAgentService implements OnModuleInit {
  private readonly logger = new Logger(OrchestrationAgentService.name);

  constructor(
    private readonly eventConsumerRegistry: EventConsumerRegistryService,
  ) {}

  onModuleInit() {
    this.logger.log('[Orchestration Agent] Registering distributed workflows...');
    
    // Example: Register the orchestration agent to listen for student.created
    // This allows cross-module side-effects without the students module calling finance directly!
    this.eventConsumerRegistry.register({
      name: 'OrchestrationAgent.studentCreated',
      event_name: 'student.created',
      handle: async (event: DomainEvent<'student.created'>) => {
        this.logger.log(`[Orchestration Agent] Triggered cross-domain workflow for student.created (${event.aggregate_id})`);
        
        // In a real system, this would dispatch intents to the Finance module or other modules
        // e.g., await this.agp.execute({ actionName: 'CREATE_LEDGER', handler: () => financeService.createLedger(...) })
      }
    });

    this.eventConsumerRegistry.register({
      name: 'OrchestrationAgent.repairTriggered',
      event_name: 'system.repair.triggered',
      handle: async (event: DomainEvent<'system.repair.triggered'>) => {
        this.logger.warn(`[Orchestration Agent] Monitoring self-healing fallback for action: ${event.payload.action}`);
      }
    });
  }
}
