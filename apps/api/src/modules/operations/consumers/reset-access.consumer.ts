import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ResetAccessConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'reset-access.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'reset-access' && event.payload.action_id !== 'reset-access') {
      return;
    }

    // TODO: Implement domain logic for reset-access
    console.log('[ResetAccessConsumer] Executing action:', event.payload);
  }
}
