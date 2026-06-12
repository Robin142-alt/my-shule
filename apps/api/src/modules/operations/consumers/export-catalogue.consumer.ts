import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportCatalogueConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-catalogue.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-catalogue' && event.payload.action_id !== 'export-catalogue') {
      return;
    }

    // TODO: Implement domain logic for export-catalogue
    console.log('[ExportCatalogueConsumer] Executing action:', event.payload);
  }
}
