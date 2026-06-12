import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class GenerateInvoicesConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'generate-invoices.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'generate-invoices' && event.payload.action_id !== 'generate-invoices') {
      return;
    }

    // TODO: Implement domain logic for generate-invoices
    console.log('[GenerateInvoicesConsumer] Executing action:', event.payload);
  }
}
