import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ResolveConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'resolve.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'resolve' && event.payload.action_id !== 'resolve') {
      return;
    }

    // TODO: Implement domain logic for resolve
    console.log('[ResolveConsumer] Executing action:', event.payload);
  }
}
