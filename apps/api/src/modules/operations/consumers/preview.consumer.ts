import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PreviewConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'preview.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'preview' && event.payload.action_id !== 'preview') {
      return;
    }

    // TODO: Implement domain logic for preview
    console.log('[PreviewConsumer] Executing action:', event.payload);
  }
}
