import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class DenyExitConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'deny-exit.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'deny-exit' && event.payload.action_id !== 'deny-exit') {
      return;
    }

    // TODO: Implement domain logic for deny-exit
    console.log('[DenyExitConsumer] Executing action:', event.payload);
  }
}
