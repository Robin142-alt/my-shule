import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ReviewMarksConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'review-marks.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'review-marks' && event.payload.action_id !== 'review-marks') {
      return;
    }

    // TODO: Implement domain logic for review-marks
    console.log('[ReviewMarksConsumer] Executing action:', event.payload);
  }
}
