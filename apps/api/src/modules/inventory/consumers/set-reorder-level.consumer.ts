import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SetReorderLevelConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'set-reorder-level.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'set-reorder-level' && event.payload.action_id !== 'set-reorder-level') {
      return;
    }

    // TODO: Implement domain logic for set-reorder-level
    console.log('[SetReorderLevelConsumer] Executing action:', event.payload);
  }
}
