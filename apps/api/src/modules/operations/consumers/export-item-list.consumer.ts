import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportItemListConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-item-list.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-item-list' && event.payload.action_id !== 'export-item-list') {
      return;
    }

    // TODO: Implement domain logic for export-item-list
    console.log('[ExportItemListConsumer] Executing action:', event.payload);
  }
}
