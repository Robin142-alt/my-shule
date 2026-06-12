import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class DownloadMissingCommentsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'download-missing-comments.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'download-missing-comments' && event.payload.action_id !== 'download-missing-comments') {
      return;
    }

    // TODO: Implement domain logic for download-missing-comments
    console.log('[DownloadMissingCommentsConsumer] Executing action:', event.payload);
  }
}
