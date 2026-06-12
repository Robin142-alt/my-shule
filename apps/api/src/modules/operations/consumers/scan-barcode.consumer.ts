import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ScanBarcodeConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'scan-barcode.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'scan-barcode' && event.payload.action_id !== 'scan-barcode') {
      return;
    }

    // TODO: Implement domain logic for scan-barcode
    console.log('[ScanBarcodeConsumer] Executing action:', event.payload);
  }
}
