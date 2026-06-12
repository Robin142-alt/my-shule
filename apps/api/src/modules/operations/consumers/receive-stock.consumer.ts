import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ReceiveStockConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'receive-stock.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'receive-stock' && event.payload.action_id !== 'receive-stock') {
      return;
    }

    // TODO: Implement domain logic for receive-stock
    console.log('[ReceiveStockConsumer] Executing action:', event.payload);
  }
}
