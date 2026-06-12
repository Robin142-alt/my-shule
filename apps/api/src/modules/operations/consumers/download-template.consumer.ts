import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class DownloadTemplateConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'download-template.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'download-template' && event.payload.action_id !== 'download-template') {
      return;
    }

    // TODO: Implement domain logic for download-template
    console.log('[DownloadTemplateConsumer] Executing action:', event.payload);
  }
}
