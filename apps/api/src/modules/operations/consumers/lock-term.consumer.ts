import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class LockTermConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'lock-term.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'lock-term' && event.payload.action_id !== 'lock-term') {
      return;
    }

    // TODO: Implement domain logic for lock-term
    console.log('[LockTermConsumer] Executing action:', event.payload);
  }
}
