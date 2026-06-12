import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AssignDepartmentConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'assign-department.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'assign-department' && event.payload.action_id !== 'assign-department') {
      return;
    }

    // TODO: Implement domain logic for assign-department
    console.log('[AssignDepartmentConsumer] Executing action:', event.payload);
  }
}
