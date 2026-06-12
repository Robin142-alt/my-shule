import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class DownloadPublishingLogConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'download-publishing-log.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'download-publishing-log' && event.payload.action_id !== 'download-publishing-log') {
      return;
    }

    // TODO: Implement domain logic for download-publishing-log
    console.log('[DownloadPublishingLogConsumer] Executing action:', event.payload);
  }
}
