import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class MarkCoveredConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'mark-covered.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'mark-covered' && event.payload.action_id !== 'mark-covered') {
      return;
    }

    // TODO: Implement domain logic for mark-covered
    console.log('[MarkCoveredConsumer] Executing action:', event.payload);
  }
}
