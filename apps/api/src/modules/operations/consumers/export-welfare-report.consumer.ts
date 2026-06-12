import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportWelfareReportConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-welfare-report.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-welfare-report' && event.payload.action_id !== 'export-welfare-report') {
      return;
    }

    // TODO: Implement domain logic for export-welfare-report
    console.log('[ExportWelfareReportConsumer] Executing action:', event.payload);
  }
}
