import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AddParentConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'add-parent.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'add-parent' && event.payload.action_id !== 'add-parent') {
      return;
    }

    // TODO: Implement domain logic for add-parent
    console.log('[AddParentConsumer] Executing action:', event.payload);
  }
}
