import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class MessageHodConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'message-hod.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'message-hod' && event.payload.action_id !== 'message-hod') {
      return;
    }

    // TODO: Implement domain logic for message-hod
    console.log('[MessageHodConsumer] Executing action:', event.payload);
  }
}
