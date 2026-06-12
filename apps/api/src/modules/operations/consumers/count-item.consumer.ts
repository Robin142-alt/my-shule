import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class CountItemConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'count-item.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'count-item' && event.payload.action_id !== 'count-item') {
      return;
    }

    // TODO: Implement domain logic for count-item
    console.log('[CountItemConsumer] Executing action:', event.payload);
  }
}
