import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class RequestOverrideConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'request-override.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'request-override' && event.payload.action_id !== 'request-override') {
      return;
    }

    // TODO: Implement domain logic for request-override
    console.log('[RequestOverrideConsumer] Executing action:', event.payload);
  }
}
