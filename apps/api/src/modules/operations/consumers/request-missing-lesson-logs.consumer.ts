import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class RequestMissingLessonLogsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'request-missing-lesson-logs.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'request-missing-lesson-logs' && event.payload.action_id !== 'request-missing-lesson-logs') {
      return;
    }

    // TODO: Implement domain logic for request-missing-lesson-logs
    console.log('[RequestMissingLessonLogsConsumer] Executing action:', event.payload);
  }
}
