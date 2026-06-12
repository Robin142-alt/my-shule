import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintMarkSheetConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-mark-sheet.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-mark-sheet' && event.payload.action_id !== 'print-mark-sheet') {
      return;
    }

    // TODO: Implement domain logic for print-mark-sheet
    console.log('[PrintMarkSheetConsumer] Executing action:', event.payload);
  }
}
