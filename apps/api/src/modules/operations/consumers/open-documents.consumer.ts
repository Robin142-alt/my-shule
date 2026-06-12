import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class OpenDocumentsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'open-documents.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'open-documents' && event.payload.action_id !== 'open-documents') {
      return;
    }

    // TODO: Implement domain logic for open-documents
    console.log('[OpenDocumentsConsumer] Executing action:', event.payload);
  }
}
