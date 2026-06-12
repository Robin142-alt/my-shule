import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ScheduleSessionConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'schedule-session.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'schedule-session' && event.payload.action_id !== 'schedule-session') {
      return;
    }

    // TODO: Implement domain logic for schedule-session
    console.log('[ScheduleSessionConsumer] Executing action:', event.payload);
  }
}
