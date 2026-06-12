import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SendsToFinanceForInvoiceGenerationConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'sends-to-finance-for-invoice-generation.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'sends-to-finance-for-invoice-generation' && event.payload.action_id !== 'sends-to-finance-for-invoice-generation') {
      return;
    }

    // TODO: Implement domain logic for sends-to-finance-for-invoice-generation
    console.log('[SendsToFinanceForInvoiceGenerationConsumer] Executing action:', event.payload);
  }
}
