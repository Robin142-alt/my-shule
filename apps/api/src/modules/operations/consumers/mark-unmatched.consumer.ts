import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class MarkUnmatchedConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'mark-unmatched.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'mark-unmatched' && event.payload.action_id !== 'mark-unmatched') {
      return;
    }

    // TODO: Implement domain logic for mark-unmatched
    console.log('[MarkUnmatchedConsumer] Executing action:', event.payload);
  }
}
