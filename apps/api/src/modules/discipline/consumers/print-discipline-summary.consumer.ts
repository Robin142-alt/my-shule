import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintDisciplineSummaryConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-discipline-summary.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-discipline-summary' && event.payload.action_id !== 'print-discipline-summary') {
      return;
    }

    // TODO: Implement domain logic for print-discipline-summary
    console.log('[PrintDisciplineSummaryConsumer] Executing action:', event.payload);
  }
}
