import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportMedicineStockConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-medicine-stock.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-medicine-stock' && event.payload.action_id !== 'export-medicine-stock') {
      return;
    }

    // TODO: Implement domain logic for export-medicine-stock
    console.log('[ExportMedicineStockConsumer] Executing action:', event.payload);
  }
}
