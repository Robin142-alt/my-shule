import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SendTestConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'send-test.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'send-test' && event.payload.action_id !== 'send-test') {
      return;
    }

    // TODO: Implement domain logic for send-test
    console.log('[SendTestConsumer] Executing action:', event.payload);
  }
}
