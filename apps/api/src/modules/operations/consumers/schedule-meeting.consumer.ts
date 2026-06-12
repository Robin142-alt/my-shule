import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ScheduleMeetingConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'schedule-meeting.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'schedule-meeting' && event.payload.action_id !== 'schedule-meeting') {
      return;
    }

    // TODO: Implement domain logic for schedule-meeting
    console.log('[ScheduleMeetingConsumer] Executing action:', event.payload);
  }
}
