import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AddSessionNoteConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'add-session-note.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'add-session-note' && event.payload.action_id !== 'add-session-note') {
      return;
    }

    // TODO: Implement domain logic for add-session-note
    console.log('[AddSessionNoteConsumer] Executing action:', event.payload);
  }
}
