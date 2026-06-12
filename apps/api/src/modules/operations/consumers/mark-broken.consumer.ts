import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class MarkBrokenConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'mark-broken.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'mark-broken' && event.payload.action_id !== 'mark-broken') {
      return;
    }

    // TODO: Implement domain logic for mark-broken
    console.log('[MarkBrokenConsumer] Executing action:', event.payload);
  }
}
