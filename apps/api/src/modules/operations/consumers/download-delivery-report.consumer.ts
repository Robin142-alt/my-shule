import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class DownloadDeliveryReportConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'download-delivery-report.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'download-delivery-report' && event.payload.action_id !== 'download-delivery-report') {
      return;
    }

    // TODO: Implement domain logic for download-delivery-report
    console.log('[DownloadDeliveryReportConsumer] Executing action:', event.payload);
  }
}
