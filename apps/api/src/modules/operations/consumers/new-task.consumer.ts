import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class NewTaskConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'new-task.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'new-task' && event.payload.action_id !== 'new-task') {
      return;
    }

    // TODO: Implement domain logic for new-task
    console.log('[NewTaskConsumer] Executing action:', event.payload);
  }
}
