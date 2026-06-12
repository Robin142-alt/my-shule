import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AddHodNoteConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'add-hod-note.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'add-hod-note' && event.payload.action_id !== 'add-hod-note') {
      return;
    }

    // TODO: Implement domain logic for add-hod-note
    console.log('[AddHodNoteConsumer] Executing action:', event.payload);
  }
}
