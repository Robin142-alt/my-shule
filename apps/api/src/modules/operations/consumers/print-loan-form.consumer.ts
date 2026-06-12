import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintLoanFormConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-loan-form.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-loan-form' && event.payload.action_id !== 'print-loan-form') {
      return;
    }

    // TODO: Implement domain logic for print-loan-form
    console.log('[PrintLoanFormConsumer] Executing action:', event.payload);
  }
}
