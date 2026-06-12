import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportHealthReportConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-health-report.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-health-report' && event.payload.action_id !== 'export-health-report') {
      return;
    }

    // TODO: Implement domain logic for export-health-report
    console.log('[ExportHealthReportConsumer] Executing action:', event.payload);
  }
}
