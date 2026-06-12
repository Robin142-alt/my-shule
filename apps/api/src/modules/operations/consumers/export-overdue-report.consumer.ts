import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportOverdueReportConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-overdue-report.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-overdue-report' && event.payload.action_id !== 'export-overdue-report') {
      return;
    }

    // TODO: Implement domain logic for export-overdue-report
    console.log('[ExportOverdueReportConsumer] Executing action:', event.payload);
  }
}
