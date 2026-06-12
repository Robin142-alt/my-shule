import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SendMessageConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'send-message.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'send-message' && event.payload.action_id !== 'send-message') {
      return;
    }

    // TODO: Implement domain logic for send-message
    console.log('[SendMessageConsumer] Executing action:', event.payload);
  }
}
