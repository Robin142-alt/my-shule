import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class CancelOfferConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'cancel-offer.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'cancel-offer' && event.payload.action_id !== 'cancel-offer') {
      return;
    }

    // TODO: Implement domain logic for cancel-offer
    console.log('[CancelOfferConsumer] Executing action:', event.payload);
  }
}
