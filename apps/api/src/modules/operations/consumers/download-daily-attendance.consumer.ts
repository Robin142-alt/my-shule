import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class DownloadDailyAttendanceConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'download-daily-attendance.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'download-daily-attendance' && event.payload.action_id !== 'download-daily-attendance') {
      return;
    }

    // TODO: Implement domain logic for download-daily-attendance
    console.log('[DownloadDailyAttendanceConsumer] Executing action:', event.payload);
  }
}
