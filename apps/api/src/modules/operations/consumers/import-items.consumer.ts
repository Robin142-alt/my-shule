import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ImportItemsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'import-items.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'import-items' && event.payload.action_id !== 'import-items') {
      return;
    }

    // TODO: Implement domain logic for import-items
    console.log('[ImportItemsConsumer] Executing action:', event.payload);
  }
}
