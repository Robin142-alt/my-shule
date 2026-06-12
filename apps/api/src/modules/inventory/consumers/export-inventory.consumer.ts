import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportInventoryConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-inventory.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-inventory' && event.payload.action_id !== 'export-inventory') {
      return;
    }

    // TODO: Implement domain logic for export-inventory
    console.log('[ExportInventoryConsumer] Executing action:', event.payload);
  }
}
