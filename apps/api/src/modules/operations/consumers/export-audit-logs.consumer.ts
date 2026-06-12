import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportAuditLogsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-audit-logs.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-audit-logs' && event.payload.action_id !== 'export-audit-logs') {
      return;
    }

    // TODO: Implement domain logic for export-audit-logs
    console.log('[ExportAuditLogsConsumer] Executing action:', event.payload);
  }
}
