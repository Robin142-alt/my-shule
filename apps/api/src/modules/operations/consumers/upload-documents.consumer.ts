import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class UploadDocumentsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'upload-documents.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'upload-documents' && event.payload.action_id !== 'upload-documents') {
      return;
    }

    // TODO: Implement domain logic for upload-documents
    console.log('[UploadDocumentsConsumer] Executing action:', event.payload);
  }
}
