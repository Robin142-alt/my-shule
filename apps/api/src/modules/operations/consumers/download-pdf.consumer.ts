import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class DownloadPdfConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'download-pdf.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'download-pdf' && event.payload.action_id !== 'download-pdf') {
      return;
    }

    // TODO: Implement domain logic for download-pdf
    console.log('[DownloadPdfConsumer] Executing action:', event.payload);
  }
}
