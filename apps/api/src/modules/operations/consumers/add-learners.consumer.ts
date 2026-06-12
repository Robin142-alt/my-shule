import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AddLearnersConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'add-learners.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'add-learners' && event.payload.action_id !== 'add-learners') {
      return;
    }

    // TODO: Implement domain logic for add-learners
    console.log('[AddLearnersConsumer] Executing action:', event.payload);
  }
}
