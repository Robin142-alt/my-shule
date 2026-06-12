import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ScheduleInterviewsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'schedule-interviews.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'schedule-interviews' && event.payload.action_id !== 'schedule-interviews') {
      return;
    }

    // TODO: Implement domain logic for schedule-interviews
    console.log('[ScheduleInterviewsConsumer] Executing action:', event.payload);
  }
}
