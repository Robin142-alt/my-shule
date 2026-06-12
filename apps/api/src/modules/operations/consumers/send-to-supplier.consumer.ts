import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SendToSupplierConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'send-to-supplier.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'send-to-supplier' && event.payload.action_id !== 'send-to-supplier') {
      return;
    }

    // TODO: Implement domain logic for send-to-supplier
    console.log('[SendToSupplierConsumer] Executing action:', event.payload);
  }
}
