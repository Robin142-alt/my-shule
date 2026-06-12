import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AssignRoleConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'assign-role.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'assign-role' && event.payload.action_id !== 'assign-role') {
      return;
    }

    // TODO: Implement domain logic for assign-role
    console.log('[AssignRoleConsumer] Executing action:', event.payload);
  }
}
