import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class EnterLessonLogConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'enter-lesson-log.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'enter-lesson-log' && event.payload.action_id !== 'enter-lesson-log') {
      return;
    }

    // TODO: Implement domain logic for enter-lesson-log
    console.log('[EnterLessonLogConsumer] Executing action:', event.payload);
  }
}
