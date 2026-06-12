import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportLogsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-logs.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-logs' && event.payload.action_id !== 'export-logs') {
      return;
    }

    // TODO: Implement domain logic for export-logs
    console.log('[ExportLogsConsumer] Executing action:', event.payload);
  }
}
