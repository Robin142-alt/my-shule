import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class EditModuleAccessConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'edit-module-access.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'edit-module-access' && event.payload.action_id !== 'edit-module-access') {
      return;
    }

    // TODO: Implement domain logic for edit-module-access
    console.log('[EditModuleAccessConsumer] Executing action:', event.payload);
  }
}
