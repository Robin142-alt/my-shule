import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SubmitAttendanceConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'submit-attendance.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'submit-attendance' && event.payload.action_id !== 'submit-attendance') {
      return;
    }

    // TODO: Implement domain logic for submit-attendance
    console.log('[SubmitAttendanceConsumer] Executing action:', event.payload);
  }
}
