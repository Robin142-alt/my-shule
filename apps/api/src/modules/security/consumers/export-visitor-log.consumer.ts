import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportVisitorLogConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-visitor-log.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-visitor-log' && event.payload.action_id !== 'export-visitor-log') {
      return;
    }

    // TODO: Implement domain logic for export-visitor-log
    console.log('[ExportVisitorLogConsumer] Executing action:', event.payload);
  }
}
