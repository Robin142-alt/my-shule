import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class VerifyDocumentsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'verify-documents.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'verify-documents' && event.payload.action_id !== 'verify-documents') {
      return;
    }

    // TODO: Implement domain logic for verify-documents
    console.log('[VerifyDocumentsConsumer] Executing action:', event.payload);
  }
}
