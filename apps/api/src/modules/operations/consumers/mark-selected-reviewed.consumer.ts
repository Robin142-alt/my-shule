import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class MarkSelectedReviewedConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'mark-selected-reviewed.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'mark-selected-reviewed' && event.payload.action_id !== 'mark-selected-reviewed') {
      return;
    }

    // TODO: Implement domain logic for mark-selected-reviewed
    console.log('[MarkSelectedReviewedConsumer] Executing action:', event.payload);
  }
}
