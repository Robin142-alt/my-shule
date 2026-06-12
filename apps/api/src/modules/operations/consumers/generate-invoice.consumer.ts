import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class GenerateInvoiceConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'generate-invoice.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'generate-invoice' && event.payload.action_id !== 'generate-invoice') {
      return;
    }

    // TODO: Implement domain logic for generate-invoice
    console.log('[GenerateInvoiceConsumer] Executing action:', event.payload);
  }
}
