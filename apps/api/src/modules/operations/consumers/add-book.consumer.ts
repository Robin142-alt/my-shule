import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AddBookConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'add-book.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'add-book' && event.payload.action_id !== 'add-book') {
      return;
    }

    // TODO: Implement domain logic for add-book
    console.log('[AddBookConsumer] Executing action:', event.payload);
  }
}
