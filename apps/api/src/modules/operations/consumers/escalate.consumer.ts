import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class EscalateConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'escalate.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'escalate' && event.payload.action_id !== 'escalate') {
      return;
    }

    // TODO: Implement domain logic for escalate
    console.log('[EscalateConsumer] Executing action:', event.payload);
  }
}
