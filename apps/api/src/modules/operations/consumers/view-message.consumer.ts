import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ViewMessageConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'view-message.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'view-message' && event.payload.action_id !== 'view-message') {
      return;
    }

    // TODO: Implement domain logic for view-message
    console.log('[ViewMessageConsumer] Executing action:', event.payload);
  }
}
