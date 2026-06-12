import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SaveDraftConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'save-draft.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'save-draft' && event.payload.action_id !== 'save-draft') {
      return;
    }

    // TODO: Implement domain logic for save-draft
    console.log('[SaveDraftConsumer] Executing action:', event.payload);
  }
}
