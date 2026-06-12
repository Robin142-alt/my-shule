import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintOfferLettersConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-offer-letters.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-offer-letters' && event.payload.action_id !== 'print-offer-letters') {
      return;
    }

    // TODO: Implement domain logic for print-offer-letters
    console.log('[PrintOfferLettersConsumer] Executing action:', event.payload);
  }
}
