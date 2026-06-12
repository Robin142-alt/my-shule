import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class RecordManualPaymentConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'record-manual-payment.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'record-manual-payment' && event.payload.action_id !== 'record-manual-payment') {
      return;
    }

    // TODO: Implement domain logic for record-manual-payment
    console.log('[RecordManualPaymentConsumer] Executing action:', event.payload);
  }
}
