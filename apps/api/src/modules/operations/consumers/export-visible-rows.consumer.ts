import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportVisibleRowsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-visible-rows.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-visible-rows' && event.payload.action_id !== 'export-visible-rows') {
      return;
    }

    // TODO: Implement domain logic for export-visible-rows
    console.log('[ExportVisibleRowsConsumer] Executing action:', event.payload);
  }
}
