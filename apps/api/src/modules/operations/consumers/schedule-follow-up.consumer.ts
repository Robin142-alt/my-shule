import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ScheduleFollowUpConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'schedule-follow-up.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'schedule-follow-up' && event.payload.action_id !== 'schedule-follow-up') {
      return;
    }

    // TODO: Implement domain logic for schedule-follow-up
    console.log('[ScheduleFollowUpConsumer] Executing action:', event.payload);
  }
}
