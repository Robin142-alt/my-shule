import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SwitchChildConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'switch-child.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'switch-child' && event.payload.action_id !== 'switch-child') {
      return;
    }

    // TODO: Implement domain logic for switch-child
    console.log('[SwitchChildConsumer] Executing action:', event.payload);
  }
}
