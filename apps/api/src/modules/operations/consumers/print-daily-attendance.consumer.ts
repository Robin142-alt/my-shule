import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintDailyAttendanceConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-daily-attendance.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-daily-attendance' && event.payload.action_id !== 'print-daily-attendance') {
      return;
    }

    // TODO: Implement domain logic for print-daily-attendance
    console.log('[PrintDailyAttendanceConsumer] Executing action:', event.payload);
  }
}
