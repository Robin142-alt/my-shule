import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ScheduleObservationConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'schedule-observation.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'schedule-observation' && event.payload.action_id !== 'schedule-observation') {
      return;
    }

    // TODO: Implement domain logic for schedule-observation
    console.log('[ScheduleObservationConsumer] Executing action:', event.payload);
  }
}
