import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class MarkServedConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'mark-served.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'mark-served' && event.payload.action_id !== 'mark-served') {
      return;
    }

    // TODO: Implement domain logic for mark-served
    console.log('[MarkServedConsumer] Executing action:', event.payload);
  }
}
