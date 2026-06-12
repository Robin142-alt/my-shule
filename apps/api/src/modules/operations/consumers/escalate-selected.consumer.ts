import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class EscalateSelectedConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'escalate-selected.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'escalate-selected' && event.payload.action_id !== 'escalate-selected') {
      return;
    }

    // TODO: Implement domain logic for escalate-selected
    console.log('[EscalateSelectedConsumer] Executing action:', event.payload);
  }
}
