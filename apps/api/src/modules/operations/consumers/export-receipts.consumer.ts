import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportReceiptsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-receipts.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-receipts' && event.payload.action_id !== 'export-receipts') {
      return;
    }

    // TODO: Implement domain logic for export-receipts
    console.log('[ExportReceiptsConsumer] Executing action:', event.payload);
  }
}
