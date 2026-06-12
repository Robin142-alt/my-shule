import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class DownloadErrorReportConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'download-error-report.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'download-error-report' && event.payload.action_id !== 'download-error-report') {
      return;
    }

    // TODO: Implement domain logic for download-error-report
    console.log('[DownloadErrorReportConsumer] Executing action:', event.payload);
  }
}
