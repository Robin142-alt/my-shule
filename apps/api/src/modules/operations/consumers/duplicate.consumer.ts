import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class DuplicateConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'duplicate.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'duplicate' && event.payload.action_id !== 'duplicate') {
      return;
    }

    // TODO: Implement domain logic for duplicate
    console.log('[DuplicateConsumer] Executing action:', event.payload);
  }
}
