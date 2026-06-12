import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ScheduleVisitConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'schedule-visit.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'schedule-visit' && event.payload.action_id !== 'schedule-visit') {
      return;
    }

    // TODO: Implement domain logic for schedule-visit
    console.log('[ScheduleVisitConsumer] Executing action:', event.payload);
  }
}
