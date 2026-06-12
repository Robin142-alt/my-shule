import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SubmitLessonLogConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'submit-lesson-log.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'submit-lesson-log' && event.payload.action_id !== 'submit-lesson-log') {
      return;
    }

    // TODO: Implement domain logic for submit-lesson-log
    console.log('[SubmitLessonLogConsumer] Executing action:', event.payload);
  }
}
