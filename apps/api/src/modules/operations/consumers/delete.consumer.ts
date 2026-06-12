import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class DeleteConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'delete.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'delete' && event.payload.action_id !== 'delete') {
      return;
    }

    // TODO: Implement domain logic for delete
    console.log('[DeleteConsumer] Executing action:', event.payload);
  }
}
