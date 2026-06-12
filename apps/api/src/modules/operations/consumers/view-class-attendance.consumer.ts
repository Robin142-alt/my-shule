import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ViewClassAttendanceConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'view-class-attendance.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'view-class-attendance' && event.payload.action_id !== 'view-class-attendance') {
      return;
    }

    // TODO: Implement domain logic for view-class-attendance
    console.log('[ViewClassAttendanceConsumer] Executing action:', event.payload);
  }
}
