import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class RejectConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'reject.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'reject' && event.payload.action_id !== 'reject') {
      return;
    }

    // TODO: Implement domain logic for reject
    console.log('[RejectConsumer] Executing action:', event.payload);
  }
}
