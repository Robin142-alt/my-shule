import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PreviewImportConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'preview-import.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'preview-import' && event.payload.action_id !== 'preview-import') {
      return;
    }

    // TODO: Implement domain logic for preview-import
    console.log('[PreviewImportConsumer] Executing action:', event.payload);
  }
}
