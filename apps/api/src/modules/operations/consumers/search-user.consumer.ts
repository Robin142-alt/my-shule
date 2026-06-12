import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SearchUserConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'search-user.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'search-user' && event.payload.action_id !== 'search-user') {
      return;
    }

    // TODO: Implement domain logic for search-user
    console.log('[SearchUserConsumer] Executing action:', event.payload);
  }
}
