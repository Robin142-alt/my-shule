import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class EditItemConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'edit-item.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'edit-item' && event.payload.action_id !== 'edit-item') {
      return;
    }

    // TODO: Implement domain logic for edit-item
    console.log('[EditItemConsumer] Executing action:', event.payload);
  }
}
