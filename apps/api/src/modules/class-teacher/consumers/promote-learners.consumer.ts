import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PromoteLearnersConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'promote-learners.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'promote-learners' && event.payload.action_id !== 'promote-learners') {
      return;
    }

    // TODO: Implement domain logic for promote-learners
    console.log('[PromoteLearnersConsumer] Executing action:', event.payload);
  }
}
