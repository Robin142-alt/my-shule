import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class EditRowConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'edit-row.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'edit-row' && event.payload.action_id !== 'edit-row') {
      return;
    }

    // TODO: Implement domain logic for edit-row
    console.log('[EditRowConsumer] Executing action:', event.payload);
  }
}
