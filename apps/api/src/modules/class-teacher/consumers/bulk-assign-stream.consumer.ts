import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class BulkAssignStreamConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'bulk-assign-stream.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'bulk-assign-stream' && event.payload.action_id !== 'bulk-assign-stream') {
      return;
    }

    // TODO: Implement domain logic for bulk-assign-stream
    console.log('[BulkAssignStreamConsumer] Executing action:', event.payload);
  }
}
