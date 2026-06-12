import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class GenerateOfferLetterConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'generate-offer-letter.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'generate-offer-letter' && event.payload.action_id !== 'generate-offer-letter') {
      return;
    }

    // TODO: Implement domain logic for generate-offer-letter
    console.log('[GenerateOfferLetterConsumer] Executing action:', event.payload);
  }
}
