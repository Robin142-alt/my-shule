import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportSelectedConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-selected.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-selected' && event.payload.action_id !== 'export-selected') {
      return;
    }

    // TODO: Implement domain logic for export-selected
    console.log('[ExportSelectedConsumer] Executing action:', event.payload);
  }
}
