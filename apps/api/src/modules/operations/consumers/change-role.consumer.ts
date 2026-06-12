import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ChangeRoleConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'change-role.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'change-role' && event.payload.action_id !== 'change-role') {
      return;
    }

    // TODO: Implement domain logic for change-role
    console.log('[ChangeRoleConsumer] Executing action:', event.payload);
  }
}
