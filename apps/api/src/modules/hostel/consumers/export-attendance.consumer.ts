import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportAttendanceConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-attendance.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-attendance' && event.payload.action_id !== 'export-attendance') {
      return;
    }

    // TODO: Implement domain logic for export-attendance
    console.log('[ExportAttendanceConsumer] Executing action:', event.payload);
  }
}
