import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class LockSetupConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'lock-setup.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'lock-setup' && event.payload.action_id !== 'lock-setup') {
      return;
    }

    // TODO: Implement domain logic for lock-setup
    console.log('[LockSetupConsumer] Executing action:', event.payload);
  }
}
