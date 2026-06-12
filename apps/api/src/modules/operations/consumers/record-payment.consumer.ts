import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class RecordPaymentConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'record-payment.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'record-payment' && event.payload.action_id !== 'record-payment') {
      return;
    }

    // TODO: Implement domain logic for record-payment
    console.log('[RecordPaymentConsumer] Executing action:', event.payload);
  }
}
