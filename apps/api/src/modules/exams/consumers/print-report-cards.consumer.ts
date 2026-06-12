import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintReportCardsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-report-cards.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-report-cards' && event.payload.action_id !== 'print-report-cards') {
      return;
    }

    // TODO: Implement domain logic for print-report-cards
    console.log('[PrintReportCardsConsumer] Executing action:', event.payload);
  }
}
