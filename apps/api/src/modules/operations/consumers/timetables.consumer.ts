import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class TimetablesConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'timetables.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'timetables' && event.payload.action_id !== 'timetables') {
      return;
    }

    // TODO: Implement domain logic for timetables
    console.log('[TimetablesConsumer] Executing action:', event.payload);
  }
}
