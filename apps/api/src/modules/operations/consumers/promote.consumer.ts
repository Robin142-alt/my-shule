import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PromoteConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'promote.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'promote' && event.payload.action_id !== 'promote') {
      return;
    }

    // TODO: Implement domain logic for promote
    console.log('[PromoteConsumer] Executing action:', event.payload);
  }
}
