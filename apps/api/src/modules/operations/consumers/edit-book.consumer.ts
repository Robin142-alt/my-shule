import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class EditBookConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'edit-book.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'edit-book' && event.payload.action_id !== 'edit-book') {
      return;
    }

    // TODO: Implement domain logic for edit-book
    console.log('[EditBookConsumer] Executing action:', event.payload);
  }
}
