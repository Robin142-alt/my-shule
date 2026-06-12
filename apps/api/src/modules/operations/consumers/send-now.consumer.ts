import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SendNowConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'send-now.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'send-now' && event.payload.action_id !== 'send-now') {
      return;
    }

    // TODO: Implement domain logic for send-now
    console.log('[SendNowConsumer] Executing action:', event.payload);
  }
}
