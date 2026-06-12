import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ShortlistConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'shortlist.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'shortlist' && event.payload.action_id !== 'shortlist') {
      return;
    }

    // TODO: Implement domain logic for shortlist
    console.log('[ShortlistConsumer] Executing action:', event.payload);
  }
}
