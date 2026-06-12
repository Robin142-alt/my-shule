import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class BulkScheduleConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'bulk-schedule.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'bulk-schedule' && event.payload.action_id !== 'bulk-schedule') {
      return;
    }

    // TODO: Implement domain logic for bulk-schedule
    console.log('[BulkScheduleConsumer] Executing action:', event.payload);
  }
}
