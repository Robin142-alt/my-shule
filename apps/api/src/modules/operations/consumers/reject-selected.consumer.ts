import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class RejectSelectedConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'reject-selected.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'reject-selected' && event.payload.action_id !== 'reject-selected') {
      return;
    }

    // TODO: Implement domain logic for reject-selected
    console.log('[RejectSelectedConsumer] Executing action:', event.payload);
  }
}
