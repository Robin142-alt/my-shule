import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class CancelConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'cancel.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'cancel' && event.payload.action_id !== 'cancel') {
      return;
    }

    // TODO: Implement domain logic for cancel
    console.log('[CancelConsumer] Executing action:', event.payload);
  }
}
