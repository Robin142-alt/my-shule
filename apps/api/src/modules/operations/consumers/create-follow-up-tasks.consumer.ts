import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class CreateFollowUpTasksConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'create-follow-up-tasks.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'create-follow-up-tasks' && event.payload.action_id !== 'create-follow-up-tasks') {
      return;
    }

    // TODO: Implement domain logic for create-follow-up-tasks
    console.log('[CreateFollowUpTasksConsumer] Executing action:', event.payload);
  }
}
