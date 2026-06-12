import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportPendingListConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-pending-list.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-pending-list' && event.payload.action_id !== 'export-pending-list') {
      return;
    }

    // TODO: Implement domain logic for export-pending-list
    console.log('[ExportPendingListConsumer] Executing action:', event.payload);
  }
}
