import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class DownloadCoverageReportConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'download-coverage-report.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'download-coverage-report' && event.payload.action_id !== 'download-coverage-report') {
      return;
    }

    // TODO: Implement domain logic for download-coverage-report
    console.log('[DownloadCoverageReportConsumer] Executing action:', event.payload);
  }
}
