import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class DownloadVisitNoteWhereAllowedConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'download-visit-note-where-allowed.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'download-visit-note-where-allowed' && event.payload.action_id !== 'download-visit-note-where-allowed') {
      return;
    }

    // TODO: Implement domain logic for download-visit-note-where-allowed
    console.log('[DownloadVisitNoteWhereAllowedConsumer] Executing action:', event.payload);
  }
}
