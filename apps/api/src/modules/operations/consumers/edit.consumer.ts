import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class EditConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'edit.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'edit' && event.payload.action_id !== 'edit') {
      return;
    }

    // TODO: Implement domain logic for edit
    console.log('[EditConsumer] Executing action:', event.payload);
  }
}
