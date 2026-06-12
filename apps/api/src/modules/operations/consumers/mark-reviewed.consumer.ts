import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class MarkReviewedConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'mark-reviewed.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'mark-reviewed' && event.payload.action_id !== 'mark-reviewed') {
      return;
    }

    // TODO: Implement domain logic for mark-reviewed
    console.log('[MarkReviewedConsumer] Executing action:', event.payload);
  }
}
