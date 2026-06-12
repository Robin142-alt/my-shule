import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class UpdateStockConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'update-stock.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'update-stock' && event.payload.action_id !== 'update-stock') {
      return;
    }

    // TODO: Implement domain logic for update-stock
    console.log('[UpdateStockConsumer] Executing action:', event.payload);
  }
}
