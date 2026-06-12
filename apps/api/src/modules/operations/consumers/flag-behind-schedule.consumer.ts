import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class FlagBehindScheduleConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'flag-behind-schedule.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'flag-behind-schedule' && event.payload.action_id !== 'flag-behind-schedule') {
      return;
    }

    // TODO: Implement domain logic for flag-behind-schedule
    console.log('[FlagBehindScheduleConsumer] Executing action:', event.payload);
  }
}
