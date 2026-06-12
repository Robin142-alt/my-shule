import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AddSchoolConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'add-school.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'add-school' && event.payload.action_id !== 'add-school') {
      return;
    }

    // TODO: Implement domain logic for add-school
    console.log('[AddSchoolConsumer] Executing action:', event.payload);
  }
}
