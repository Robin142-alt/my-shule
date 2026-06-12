import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class MarkFrequentVisitorConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'mark-frequent-visitor.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'mark-frequent-visitor' && event.payload.action_id !== 'mark-frequent-visitor') {
      return;
    }

    // TODO: Implement domain logic for mark-frequent-visitor
    console.log('[MarkFrequentVisitorConsumer] Executing action:', event.payload);
  }
}
