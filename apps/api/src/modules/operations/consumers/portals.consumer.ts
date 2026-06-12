import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PortalsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'portals.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'portals' && event.payload.action_id !== 'portals') {
      return;
    }

    // TODO: Implement domain logic for portals
    console.log('[PortalsConsumer] Executing action:', event.payload);
  }
}
