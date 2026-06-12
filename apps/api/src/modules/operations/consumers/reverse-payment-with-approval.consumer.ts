import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ReversePaymentWithApprovalConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'reverse-payment-with-approval.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'reverse-payment-with-approval' && event.payload.action_id !== 'reverse-payment-with-approval') {
      return;
    }

    // TODO: Implement domain logic for reverse-payment-with-approval
    console.log('[ReversePaymentWithApprovalConsumer] Executing action:', event.payload);
  }
}
