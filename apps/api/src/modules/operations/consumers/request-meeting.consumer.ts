import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class RequestMeetingConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'request-meeting.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'request-meeting' && event.payload.action_id !== 'request-meeting') {
      return;
    }

    // TODO: Implement domain logic for request-meeting
    console.log('[RequestMeetingConsumer] Executing action:', event.payload);
  }
}
