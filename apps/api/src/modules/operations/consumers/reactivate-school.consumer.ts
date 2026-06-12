import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ReactivateSchoolConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'reactivate-school.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'reactivate-school' && event.payload.action_id !== 'reactivate-school') {
      return;
    }

    // TODO: Implement domain logic for reactivate-school
    console.log('[ReactivateSchoolConsumer] Executing action:', event.payload);
  }
}
