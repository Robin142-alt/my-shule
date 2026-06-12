import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ScheduleMessageConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'schedule-message.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'schedule-message' && event.payload.action_id !== 'schedule-message') {
      return;
    }

    // TODO: Implement domain logic for schedule-message
    console.log('[ScheduleMessageConsumer] Executing action:', event.payload);
  }
}
