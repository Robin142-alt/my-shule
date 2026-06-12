import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ReviewConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'review.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'review' && event.payload.action_id !== 'review') {
      return;
    }

    // TODO: Implement domain logic for review
    console.log('[ReviewConsumer] Executing action:', event.payload);
  }
}
