import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class UploadDocumentConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'upload-document.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'upload-document' && event.payload.action_id !== 'upload-document') {
      return;
    }

    // TODO: Implement domain logic for upload-document
    console.log('[UploadDocumentConsumer] Executing action:', event.payload);
  }
}
