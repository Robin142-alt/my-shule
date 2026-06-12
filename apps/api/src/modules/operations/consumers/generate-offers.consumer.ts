import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class GenerateOffersConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'generate-offers.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'generate-offers' && event.payload.action_id !== 'generate-offers') {
      return;
    }

    // TODO: Implement domain logic for generate-offers
    console.log('[GenerateOffersConsumer] Executing action:', event.payload);
  }
}
