import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class DownloadBatchPdfConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'download-batch-pdf.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'download-batch-pdf' && event.payload.action_id !== 'download-batch-pdf') {
      return;
    }

    // TODO: Implement domain logic for download-batch-pdf
    console.log('[DownloadBatchPdfConsumer] Executing action:', event.payload);
  }
}
