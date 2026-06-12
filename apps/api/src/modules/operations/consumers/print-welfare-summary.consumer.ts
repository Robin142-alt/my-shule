import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintWelfareSummaryConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-welfare-summary.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-welfare-summary' && event.payload.action_id !== 'print-welfare-summary') {
      return;
    }

    // TODO: Implement domain logic for print-welfare-summary
    console.log('[PrintWelfareSummaryConsumer] Executing action:', event.payload);
  }
}
