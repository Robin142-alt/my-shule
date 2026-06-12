import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class DownloadWelfareReportConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'download-welfare-report.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'download-welfare-report' && event.payload.action_id !== 'download-welfare-report') {
      return;
    }

    // TODO: Implement domain logic for download-welfare-report
    console.log('[DownloadWelfareReportConsumer] Executing action:', event.payload);
  }
}
