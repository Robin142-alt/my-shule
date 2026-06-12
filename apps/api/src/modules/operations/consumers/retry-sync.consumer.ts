import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class RetrySyncConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'retry-sync.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'retry-sync' && event.payload.action_id !== 'retry-sync') {
      return;
    }

    // TODO: Implement domain logic for retry-sync
    console.log('[RetrySyncConsumer] Executing action:', event.payload);
  }
}
