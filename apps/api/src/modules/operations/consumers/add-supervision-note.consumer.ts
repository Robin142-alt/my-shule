import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AddSupervisionNoteConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'add-supervision-note.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'add-supervision-note' && event.payload.action_id !== 'add-supervision-note') {
      return;
    }

    // TODO: Implement domain logic for add-supervision-note
    console.log('[AddSupervisionNoteConsumer] Executing action:', event.payload);
  }
}
