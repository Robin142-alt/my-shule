import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AddTopicConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'add-topic.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'add-topic' && event.payload.action_id !== 'add-topic') {
      return;
    }

    // TODO: Implement domain logic for add-topic
    console.log('[AddTopicConsumer] Executing action:', event.payload);
  }
}
