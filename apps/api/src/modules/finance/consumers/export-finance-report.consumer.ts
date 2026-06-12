import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportFinanceReportConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-finance-report.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-finance-report' && event.payload.action_id !== 'export-finance-report') {
      return;
    }

    // TODO: Implement domain logic for export-finance-report
    console.log('[ExportFinanceReportConsumer] Executing action:', event.payload);
  }
}
