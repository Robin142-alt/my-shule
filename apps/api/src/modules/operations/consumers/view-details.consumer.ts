import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ViewDetailsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'view-details.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'view-details' && event.payload.action_id !== 'view-details') {
      return;
    }

    // TODO: Implement domain logic for view-details
    console.log('[ViewDetailsConsumer] Executing action:', event.payload);
  }
}
