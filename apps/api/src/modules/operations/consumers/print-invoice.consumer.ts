import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintInvoiceConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-invoice.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-invoice' && event.payload.action_id !== 'print-invoice') {
      return;
    }

    // TODO: Implement domain logic for print-invoice
    console.log('[PrintInvoiceConsumer] Executing action:', event.payload);
  }
}
