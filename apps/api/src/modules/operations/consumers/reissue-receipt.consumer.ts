import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ReissueReceiptConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'reissue-receipt.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'reissue-receipt' && event.payload.action_id !== 'reissue-receipt') {
      return;
    }

    // TODO: Implement domain logic for reissue-receipt
    console.log('[ReissueReceiptConsumer] Executing action:', event.payload);
  }
}
