import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class DownloadDisciplineReportConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'download-discipline-report.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'download-discipline-report' && event.payload.action_id !== 'download-discipline-report') {
      return;
    }

    // TODO: Implement domain logic for download-discipline-report
    console.log('[DownloadDisciplineReportConsumer] Executing action:', event.payload);
  }
}
