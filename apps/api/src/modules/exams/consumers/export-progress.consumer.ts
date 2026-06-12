import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportProgressConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-progress.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-progress' && event.payload.action_id !== 'export-progress') {
      return;
    }

    // TODO: Implement domain logic for export-progress
    console.log('[ExportProgressConsumer] Executing action:', event.payload);
  }
}
