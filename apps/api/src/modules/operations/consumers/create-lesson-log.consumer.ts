import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class CreateLessonLogConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'create-lesson-log.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'create-lesson-log' && event.payload.action_id !== 'create-lesson-log') {
      return;
    }

    // TODO: Implement domain logic for create-lesson-log
    console.log('[CreateLessonLogConsumer] Executing action:', event.payload);
  }
}
