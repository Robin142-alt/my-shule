import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AddRouteConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'add-route.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'add-route' && event.payload.action_id !== 'add-route') {
      return;
    }

    // TODO: Implement domain logic for add-route
    console.log('[AddRouteConsumer] Executing action:', event.payload);
  }
}
