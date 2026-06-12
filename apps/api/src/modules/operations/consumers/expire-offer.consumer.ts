import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExpireOfferConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'expire-offer.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'expire-offer' && event.payload.action_id !== 'expire-offer') {
      return;
    }

    // TODO: Implement domain logic for expire-offer
    console.log('[ExpireOfferConsumer] Executing action:', event.payload);
  }
}
