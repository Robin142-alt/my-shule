import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class CreateLessonPlanConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'create-lesson-plan.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'create-lesson-plan' && event.payload.action_id !== 'create-lesson-plan') {
      return;
    }

    // TODO: Implement domain logic for create-lesson-plan
    console.log('[CreateLessonPlanConsumer] Executing action:', event.payload);
  }
}
