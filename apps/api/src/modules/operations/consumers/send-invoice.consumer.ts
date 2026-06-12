import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SendInvoiceConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'send-invoice.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'send-invoice' && event.payload.action_id !== 'send-invoice') {
      return;
    }

    // TODO: Implement domain logic for send-invoice
    console.log('[SendInvoiceConsumer] Executing action:', event.payload);
  }
}
