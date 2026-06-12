import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SetActiveConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'set-active.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'set-active' && event.payload.action_id !== 'set-active') {
      return;
    }

    // TODO: Implement domain logic for set-active
    console.log('[SetActiveConsumer] Executing action:', event.payload);
  }
}
