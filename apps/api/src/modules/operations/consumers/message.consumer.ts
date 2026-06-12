import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class MessageConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'message.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'message' && event.payload.action_id !== 'message') {
      return;
    }

    // TODO: Implement domain logic for message
    console.log('[MessageConsumer] Executing action:', event.payload);
  }
}
