import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportVehicleListConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-vehicle-list.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-vehicle-list' && event.payload.action_id !== 'export-vehicle-list') {
      return;
    }

    // TODO: Implement domain logic for export-vehicle-list
    console.log('[ExportVehicleListConsumer] Executing action:', event.payload);
  }
}
