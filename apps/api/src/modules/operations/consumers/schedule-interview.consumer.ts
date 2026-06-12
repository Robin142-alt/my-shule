import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ScheduleInterviewConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'schedule-interview.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'schedule-interview' && event.payload.action_id !== 'schedule-interview') {
      return;
    }

    // TODO: Implement domain logic for schedule-interview
    console.log('[ScheduleInterviewConsumer] Executing action:', event.payload);
  }
}
