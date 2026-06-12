import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class BulkGenerateConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'bulk-generate.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'bulk-generate' && event.payload.action_id !== 'bulk-generate') {
      return;
    }

    // TODO: Implement domain logic for bulk-generate
    console.log('[BulkGenerateConsumer] Executing action:', event.payload);
  }
}
