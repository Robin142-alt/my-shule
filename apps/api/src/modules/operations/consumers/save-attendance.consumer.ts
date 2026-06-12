import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SaveAttendanceConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'save-attendance.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'save-attendance' && event.payload.action_id !== 'save-attendance') {
      return;
    }

    // TODO: Implement domain logic for save-attendance
    console.log('[SaveAttendanceConsumer] Executing action:', event.payload);
  }
}
