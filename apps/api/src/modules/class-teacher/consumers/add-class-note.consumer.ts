import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AddClassNoteConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'add-class-note.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'add-class-note' && event.payload.action_id !== 'add-class-note') {
      return;
    }

    // TODO: Implement domain logic for add-class-note
    console.log('[AddClassNoteConsumer] Executing action:', event.payload);
  }
}
