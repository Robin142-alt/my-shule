import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class MarkAttendanceConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'mark-attendance.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'mark-attendance' && event.payload.action_id !== 'mark-attendance') {
      return;
    }

    // TODO: Implement domain logic for mark-attendance
    console.log('[MarkAttendanceConsumer] Executing action:', event.payload);
  }
}
