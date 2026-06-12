import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class RequestLessonLogConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'request-lesson-log.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'request-lesson-log' && event.payload.action_id !== 'request-lesson-log') {
      return;
    }

    // TODO: Implement domain logic for request-lesson-log
    console.log('[RequestLessonLogConsumer] Executing action:', event.payload);
  }
}
