import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class DownloadMaintenanceReportConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'download-maintenance-report.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'download-maintenance-report' && event.payload.action_id !== 'download-maintenance-report') {
      return;
    }

    // TODO: Implement domain logic for download-maintenance-report
    console.log('[DownloadMaintenanceReportConsumer] Executing action:', event.payload);
  }
}
