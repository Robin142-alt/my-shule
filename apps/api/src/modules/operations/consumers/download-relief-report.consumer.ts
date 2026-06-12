import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class DownloadReliefReportConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'download-relief-report.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'download-relief-report' && event.payload.action_id !== 'download-relief-report') {
      return;
    }

    // TODO: Implement domain logic for download-relief-report
    console.log('[DownloadReliefReportConsumer] Executing action:', event.payload);
  }
}
