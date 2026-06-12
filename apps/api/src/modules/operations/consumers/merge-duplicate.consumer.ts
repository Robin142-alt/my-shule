import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class MergeDuplicateConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'merge-duplicate.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'merge-duplicate' && event.payload.action_id !== 'merge-duplicate') {
      return;
    }

    // TODO: Implement domain logic for merge-duplicate
    console.log('[MergeDuplicateConsumer] Executing action:', event.payload);
  }
}
