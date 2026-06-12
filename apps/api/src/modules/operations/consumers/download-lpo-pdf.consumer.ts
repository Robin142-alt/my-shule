import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class DownloadLpoPdfConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'download-lpo-pdf.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'download-lpo-pdf' && event.payload.action_id !== 'download-lpo-pdf') {
      return;
    }

    // TODO: Implement domain logic for download-lpo-pdf
    console.log('[DownloadLpoPdfConsumer] Executing action:', event.payload);
  }
}
