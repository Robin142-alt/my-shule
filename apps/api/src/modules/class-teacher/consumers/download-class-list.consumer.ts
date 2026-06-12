import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class DownloadClassListConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'download-class-list.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'download-class-list' && event.payload.action_id !== 'download-class-list') {
      return;
    }

    // TODO: Implement domain logic for download-class-list
    console.log('[DownloadClassListConsumer] Executing action:', event.payload);
  }
}
