import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class EditAdmissionNoConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'edit-admission-no.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'edit-admission-no' && event.payload.action_id !== 'edit-admission-no') {
      return;
    }

    // TODO: Implement domain logic for edit-admission-no
    console.log('[EditAdmissionNoConsumer] Executing action:', event.payload);
  }
}
