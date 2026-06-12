import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AddDepartmentConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'add-department.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'add-department' && event.payload.action_id !== 'add-department') {
      return;
    }

    // TODO: Implement domain logic for add-department
    console.log('[AddDepartmentConsumer] Executing action:', event.payload);
  }
}
