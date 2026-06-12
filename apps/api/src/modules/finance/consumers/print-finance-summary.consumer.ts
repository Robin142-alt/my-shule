import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintFinanceSummaryConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-finance-summary.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-finance-summary' && event.payload.action_id !== 'print-finance-summary') {
      return;
    }

    // TODO: Implement domain logic for print-finance-summary
    console.log('[PrintFinanceSummaryConsumer] Executing action:', event.payload);
  }
}
