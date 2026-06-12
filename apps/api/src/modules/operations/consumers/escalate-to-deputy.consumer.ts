import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class EscalateToDeputyConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'escalate-to-deputy.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'escalate-to-deputy' && event.payload.action_id !== 'escalate-to-deputy') {
      return;
    }

    // TODO: Implement domain logic for escalate-to-deputy
    console.log('[EscalateToDeputyConsumer] Executing action:', event.payload);
  }
}
