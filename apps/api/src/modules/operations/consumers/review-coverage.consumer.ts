import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ReviewCoverageConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'review-coverage.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'review-coverage' && event.payload.action_id !== 'review-coverage') {
      return;
    }

    // TODO: Implement domain logic for review-coverage
    console.log('[ReviewCoverageConsumer] Executing action:', event.payload);
  }
}
