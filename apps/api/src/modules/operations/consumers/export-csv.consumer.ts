import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportCsvConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-csv.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-csv' && event.payload.action_id !== 'export-csv') {
      return;
    }

    // TODO: Implement domain logic for export-csv
    console.log('[ExportCsvConsumer] Executing action:', event.payload);
  }
}
