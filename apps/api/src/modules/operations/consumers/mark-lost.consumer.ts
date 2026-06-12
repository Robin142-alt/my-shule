import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class MarkLostConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'mark-lost.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'mark-lost' && event.payload.action_id !== 'mark-lost') {
      return;
    }

    // TODO: Implement domain logic for mark-lost
    console.log('[MarkLostConsumer] Executing action:', event.payload);
  }
}
