import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PreviewMessageConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'preview-message.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'preview-message' && event.payload.action_id !== 'preview-message') {
      return;
    }

    // TODO: Implement domain logic for preview-message
    console.log('[PreviewMessageConsumer] Executing action:', event.payload);
  }
}
