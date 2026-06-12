import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class RequestCapacityOverrideConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'request-capacity-override.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'request-capacity-override' && event.payload.action_id !== 'request-capacity-override') {
      return;
    }

    // TODO: Implement domain logic for request-capacity-override
    console.log('[RequestCapacityOverrideConsumer] Executing action:', event.payload);
  }
}
