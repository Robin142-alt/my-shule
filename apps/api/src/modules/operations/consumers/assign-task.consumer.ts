import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AssignTaskConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'assign-task.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'assign-task' && event.payload.action_id !== 'assign-task') {
      return;
    }

    // TODO: Implement domain logic for assign-task
    console.log('[AssignTaskConsumer] Executing action:', event.payload);
  }
}
