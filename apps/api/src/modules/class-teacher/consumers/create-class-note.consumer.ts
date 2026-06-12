import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class CreateClassNoteConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'create-class-note.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'create-class-note' && event.payload.action_id !== 'create-class-note') {
      return;
    }

    // TODO: Implement domain logic for create-class-note
    console.log('[CreateClassNoteConsumer] Executing action:', event.payload);
  }
}
