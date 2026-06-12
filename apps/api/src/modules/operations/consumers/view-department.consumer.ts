import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ViewDepartmentConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'view-department.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'view-department' && event.payload.action_id !== 'view-department') {
      return;
    }

    // TODO: Implement domain logic for view-department
    console.log('[ViewDepartmentConsumer] Executing action:', event.payload);
  }
}
