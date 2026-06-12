import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ViewLearnersConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'view-learners.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'view-learners' && event.payload.action_id !== 'view-learners') {
      return;
    }

    // TODO: Implement domain logic for view-learners
    console.log('[ViewLearnersConsumer] Executing action:', event.payload);
  }
}
