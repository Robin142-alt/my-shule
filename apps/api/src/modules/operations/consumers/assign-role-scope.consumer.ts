import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AssignRoleScopeConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'assign-role-scope.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'assign-role-scope' && event.payload.action_id !== 'assign-role-scope') {
      return;
    }

    // TODO: Implement domain logic for assign-role-scope
    console.log('[AssignRoleScopeConsumer] Executing action:', event.payload);
  }
}
