import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class DownloadNoticeConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'download-notice.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'download-notice' && event.payload.action_id !== 'download-notice') {
      return;
    }

    // TODO: Implement domain logic for download-notice
    console.log('[DownloadNoticeConsumer] Executing action:', event.payload);
  }
}
