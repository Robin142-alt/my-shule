import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class DownloadReceiptConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'download-receipt.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'download-receipt' && event.payload.action_id !== 'download-receipt') {
      return;
    }

    // TODO: Implement domain logic for download-receipt
    console.log('[DownloadReceiptConsumer] Executing action:', event.payload);
  }
}
