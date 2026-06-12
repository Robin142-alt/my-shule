import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintAttendanceSheetConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-attendance-sheet.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-attendance-sheet' && event.payload.action_id !== 'print-attendance-sheet') {
      return;
    }

    // TODO: Implement domain logic for print-attendance-sheet
    console.log('[PrintAttendanceSheetConsumer] Executing action:', event.payload);
  }
}
