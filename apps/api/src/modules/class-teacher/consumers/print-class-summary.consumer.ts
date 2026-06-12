import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintClassSummaryConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-class-summary.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-class-summary' && event.payload.action_id !== 'print-class-summary') {
      return;
    }

    // TODO: Implement domain logic for print-class-summary
    console.log('[PrintClassSummaryConsumer] Executing action:', event.payload);
  }
}
