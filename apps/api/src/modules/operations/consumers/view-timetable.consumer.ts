import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ViewTimetableConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'view-timetable.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'view-timetable' && event.payload.action_id !== 'view-timetable') {
      return;
    }

    // TODO: Implement domain logic for view-timetable
    console.log('[ViewTimetableConsumer] Executing action:', event.payload);
  }
}
