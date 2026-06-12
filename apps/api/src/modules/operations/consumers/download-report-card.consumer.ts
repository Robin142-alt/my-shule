import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class DownloadReportCardConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'download-report-card.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'download-report-card' && event.payload.action_id !== 'download-report-card') {
      return;
    }

    // TODO: Implement domain logic for download-report-card
    console.log('[DownloadReportCardConsumer] Executing action:', event.payload);
  }
}
