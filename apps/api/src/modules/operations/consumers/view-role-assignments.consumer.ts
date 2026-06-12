import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ViewRoleAssignmentsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'view-role-assignments.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'view-role-assignments' && event.payload.action_id !== 'view-role-assignments') {
      return;
    }

    // TODO: Implement domain logic for view-role-assignments
    console.log('[ViewRoleAssignmentsConsumer] Executing action:', event.payload);
  }
}
