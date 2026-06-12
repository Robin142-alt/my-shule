import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AddCostConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'add-cost.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'add-cost' && event.payload.action_id !== 'add-cost') {
      return;
    }

    // TODO: Implement domain logic for add-cost
    console.log('[AddCostConsumer] Executing action:', event.payload);
  }
}
