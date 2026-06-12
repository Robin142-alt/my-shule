import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class StartMorningReviewConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'start-morning-review.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'start-morning-review' && event.payload.action_id !== 'start-morning-review') {
      return;
    }

    // TODO: Implement domain logic for start-morning-review
    console.log('[StartMorningReviewConsumer] Executing action:', event.payload);
  }
}
