import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ViewCapacityConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'view-capacity.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'view-capacity' && event.payload.action_id !== 'view-capacity') {
      return;
    }

    // TODO: Implement domain logic for view-capacity
    console.log('[ViewCapacityConsumer] Executing action:', event.payload);
  }
}
