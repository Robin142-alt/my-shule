import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportMarkSheetConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-mark-sheet.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-mark-sheet' && event.payload.action_id !== 'export-mark-sheet') {
      return;
    }

    // TODO: Implement domain logic for export-mark-sheet
    console.log('[ExportMarkSheetConsumer] Executing action:', event.payload);
  }
}
