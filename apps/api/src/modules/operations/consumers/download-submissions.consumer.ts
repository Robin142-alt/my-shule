import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class DownloadSubmissionsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'download-submissions.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'download-submissions' && event.payload.action_id !== 'download-submissions') {
      return;
    }

    // TODO: Implement domain logic for download-submissions
    console.log('[DownloadSubmissionsConsumer] Executing action:', event.payload);
  }
}
