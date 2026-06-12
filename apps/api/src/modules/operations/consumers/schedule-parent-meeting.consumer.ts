import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ScheduleParentMeetingConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'schedule-parent-meeting.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'schedule-parent-meeting' && event.payload.action_id !== 'schedule-parent-meeting') {
      return;
    }

    // TODO: Implement domain logic for schedule-parent-meeting
    console.log('[ScheduleParentMeetingConsumer] Executing action:', event.payload);
  }
}
