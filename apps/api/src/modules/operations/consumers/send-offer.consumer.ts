import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SendOfferConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'send-offer.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'send-offer' && event.payload.action_id !== 'send-offer') {
      return;
    }

    // TODO: Implement domain logic for send-offer
    console.log('[SendOfferConsumer] Executing action:', event.payload);
  }
}
