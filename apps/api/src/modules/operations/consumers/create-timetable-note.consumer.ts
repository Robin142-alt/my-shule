import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class CreateTimetableNoteConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'create-timetable-note.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'create-timetable-note' && event.payload.action_id !== 'create-timetable-note') {
      return;
    }

    // TODO: Implement domain logic for create-timetable-note
    console.log('[CreateTimetableNoteConsumer] Executing action:', event.payload);
  }
}
