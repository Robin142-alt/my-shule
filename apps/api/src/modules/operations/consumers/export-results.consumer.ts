import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportResultsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-results.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-results' && event.payload.action_id !== 'export-results') {
      return;
    }

    // TODO: Implement domain logic for export-results
    console.log('[ExportResultsConsumer] Executing action:', event.payload);
  }
}
