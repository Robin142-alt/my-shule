import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportSuppliersConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-suppliers.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-suppliers' && event.payload.action_id !== 'export-suppliers') {
      return;
    }

    // TODO: Implement domain logic for export-suppliers
    console.log('[ExportSuppliersConsumer] Executing action:', event.payload);
  }
}
