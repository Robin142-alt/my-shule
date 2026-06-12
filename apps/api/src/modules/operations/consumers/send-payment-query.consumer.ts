import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SendPaymentQueryConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'send-payment-query.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'send-payment-query' && event.payload.action_id !== 'send-payment-query') {
      return;
    }

    // TODO: Implement domain logic for send-payment-query
    console.log('[SendPaymentQueryConsumer] Executing action:', event.payload);
  }
}
