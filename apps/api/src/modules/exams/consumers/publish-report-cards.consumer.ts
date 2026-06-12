import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PublishReportCardsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'publish-report-cards.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'publish-report-cards' && event.payload.action_id !== 'publish-report-cards') {
      return;
    }

    // TODO: Implement domain logic for publish-report-cards
    console.log('[PublishReportCardsConsumer] Executing action:', event.payload);
  }
}
