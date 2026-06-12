import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ViewAttendanceHistoryConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'view-attendance-history.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'view-attendance-history' && event.payload.action_id !== 'view-attendance-history') {
      return;
    }

    // TODO: Implement domain logic for view-attendance-history
    console.log('[ViewAttendanceHistoryConsumer] Executing action:', event.payload);
  }
}
