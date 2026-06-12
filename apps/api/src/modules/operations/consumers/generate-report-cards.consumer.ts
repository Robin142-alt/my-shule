import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class GenerateReportCardsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'generate-report-cards.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'generate-report-cards' && event.payload.action_id !== 'generate-report-cards') {
      return;
    }

    // TODO: Implement domain logic for generate-report-cards
    console.log('[GenerateReportCardsConsumer] Executing action:', event.payload);
  }
}
