import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class UploadPaymentProofConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'upload-payment-proof.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'upload-payment-proof' && event.payload.action_id !== 'upload-payment-proof') {
      return;
    }

    // TODO: Implement domain logic for upload-payment-proof
    console.log('[UploadPaymentProofConsumer] Executing action:', event.payload);
  }
}
