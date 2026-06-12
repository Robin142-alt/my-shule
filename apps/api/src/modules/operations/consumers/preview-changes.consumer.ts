import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PreviewChangesConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'preview-changes.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'preview-changes' && event.payload.action_id !== 'preview-changes') {
      return;
    }

    // TODO: Implement domain logic for preview-changes
    console.log('[PreviewChangesConsumer] Executing action:', event.payload);
  }
}
