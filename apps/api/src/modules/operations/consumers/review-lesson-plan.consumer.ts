import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ReviewLessonPlanConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'review-lesson-plan.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'review-lesson-plan' && event.payload.action_id !== 'review-lesson-plan') {
      return;
    }

    // TODO: Implement domain logic for review-lesson-plan
    console.log('[ReviewLessonPlanConsumer] Executing action:', event.payload);
  }
}
