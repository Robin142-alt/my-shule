import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class DownloadWeeklyDutyReportConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'download-weekly-duty-report.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'download-weekly-duty-report' && event.payload.action_id !== 'download-weekly-duty-report') {
      return;
    }

    // TODO: Implement domain logic for download-weekly-duty-report
    console.log('[DownloadWeeklyDutyReportConsumer] Executing action:', event.payload);
  }
}
