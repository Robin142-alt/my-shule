import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class MarkInternalNoteConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'mark-internal-note.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'mark-internal-note' && event.payload.action_id !== 'mark-internal-note') {
      return;
    }

    // TODO: Implement domain logic for mark-internal-note
    console.log('[MarkInternalNoteConsumer] Executing action:', event.payload);
  }
}
