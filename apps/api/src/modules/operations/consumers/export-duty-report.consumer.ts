import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportDutyReportConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-duty-report.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-duty-report' && event.payload.action_id !== 'export-duty-report') {
      return;
    }

    // TODO: Implement domain logic for export-duty-report
    console.log('[ExportDutyReportConsumer] Executing action:', event.payload);
  }
}
