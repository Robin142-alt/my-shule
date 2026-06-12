import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class MarkDuplicateConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'mark-duplicate.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'mark-duplicate' && event.payload.action_id !== 'mark-duplicate') {
      return;
    }

    // TODO: Implement domain logic for mark-duplicate
    console.log('[MarkDuplicateConsumer] Executing action:', event.payload);
  }
}
