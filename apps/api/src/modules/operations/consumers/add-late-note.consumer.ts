import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AddLateNoteConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'add-late-note.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'add-late-note' && event.payload.action_id !== 'add-late-note') {
      return;
    }

    // TODO: Implement domain logic for add-late-note
    console.log('[AddLateNoteConsumer] Executing action:', event.payload);
  }
}
