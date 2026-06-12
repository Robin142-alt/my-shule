import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SaveNoteConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'save-note.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'save-note' && event.payload.action_id !== 'save-note') {
      return;
    }

    // TODO: Implement domain logic for save-note
    console.log('[SaveNoteConsumer] Executing action:', event.payload);
  }
}
