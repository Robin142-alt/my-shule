import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class UndoLastImportConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'undo-last-import.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'undo-last-import' && event.payload.action_id !== 'undo-last-import') {
      return;
    }

    // TODO: Implement domain logic for undo-last-import
    console.log('[UndoLastImportConsumer] Executing action:', event.payload);
  }
}
