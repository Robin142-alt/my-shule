import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class MarkArrivedConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'mark-arrived.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'mark-arrived' && event.payload.action_id !== 'mark-arrived') {
      return;
    }

    // TODO: Implement domain logic for mark-arrived
    console.log('[MarkArrivedConsumer] Executing action:', event.payload);
  }
}
