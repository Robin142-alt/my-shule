import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class RetryWebhookConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'retry-webhook.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'retry-webhook' && event.payload.action_id !== 'retry-webhook') {
      return;
    }

    // TODO: Implement domain logic for retry-webhook
    console.log('[RetryWebhookConsumer] Executing action:', event.payload);
  }
}
