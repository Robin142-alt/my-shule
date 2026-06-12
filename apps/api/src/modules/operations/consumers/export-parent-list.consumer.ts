import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportParentListConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-parent-list.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-parent-list' && event.payload.action_id !== 'export-parent-list') {
      return;
    }

    // TODO: Implement domain logic for export-parent-list
    console.log('[ExportParentListConsumer] Executing action:', event.payload);
  }
}
