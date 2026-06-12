import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class EditSchoolConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'edit-school.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'edit-school' && event.payload.action_id !== 'edit-school') {
      return;
    }

    // TODO: Implement domain logic for edit-school
    console.log('[EditSchoolConsumer] Executing action:', event.payload);
  }
}
