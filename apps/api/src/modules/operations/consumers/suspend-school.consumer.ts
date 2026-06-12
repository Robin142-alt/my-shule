import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SuspendSchoolConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'suspend-school.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'suspend-school' && event.payload.action_id !== 'suspend-school') {
      return;
    }

    // TODO: Implement domain logic for suspend-school
    console.log('[SuspendSchoolConsumer] Executing action:', event.payload);
  }
}
