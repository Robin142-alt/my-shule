import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PreviewLetterheadConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'preview-letterhead.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'preview-letterhead' && event.payload.action_id !== 'preview-letterhead') {
      return;
    }

    // TODO: Implement domain logic for preview-letterhead
    console.log('[PreviewLetterheadConsumer] Executing action:', event.payload);
  }
}
