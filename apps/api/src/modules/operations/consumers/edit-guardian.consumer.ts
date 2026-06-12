import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class EditGuardianConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'edit-guardian.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'edit-guardian' && event.payload.action_id !== 'edit-guardian') {
      return;
    }

    // TODO: Implement domain logic for edit-guardian
    console.log('[EditGuardianConsumer] Executing action:', event.payload);
  }
}
