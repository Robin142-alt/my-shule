import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AddLessonLogConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'add-lesson-log.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'add-lesson-log' && event.payload.action_id !== 'add-lesson-log') {
      return;
    }

    // TODO: Implement domain logic for add-lesson-log
    console.log('[AddLessonLogConsumer] Executing action:', event.payload);
  }
}
