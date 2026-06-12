import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ReturnBookConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'return-book.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'return-book' && event.payload.action_id !== 'return-book') {
      return;
    }

    // TODO: Implement domain logic for return-book
    console.log('[ReturnBookConsumer] Executing action:', event.payload);
  }
}
