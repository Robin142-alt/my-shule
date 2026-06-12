import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AddFeeItemConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'add-fee-item.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'add-fee-item' && event.payload.action_id !== 'add-fee-item') {
      return;
    }

    // TODO: Implement domain logic for add-fee-item
    console.log('[AddFeeItemConsumer] Executing action:', event.payload);
  }
}
