import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class UpdateQuantityConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'update-quantity.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'update-quantity' && event.payload.action_id !== 'update-quantity') {
      return;
    }

    // TODO: Implement domain logic for update-quantity
    console.log('[UpdateQuantityConsumer] Executing action:', event.payload);
  }
}
