import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SearchConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'search.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'search' && event.payload.action_id !== 'search') {
      return;
    }

    // TODO: Implement domain logic for search
    console.log('[SearchConsumer] Executing action:', event.payload);
  }
}
