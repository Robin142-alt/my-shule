import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AddDailyNoteConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'add-daily-note.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'add-daily-note' && event.payload.action_id !== 'add-daily-note') {
      return;
    }

    // TODO: Implement domain logic for add-daily-note
    console.log('[AddDailyNoteConsumer] Executing action:', event.payload);
  }
}
