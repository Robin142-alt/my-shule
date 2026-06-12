import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ReviewApprovalsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'review-approvals.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'review-approvals' && event.payload.action_id !== 'review-approvals') {
      return;
    }

    // TODO: Implement domain logic for review-approvals
    console.log('[ReviewApprovalsConsumer] Executing action:', event.payload);
  }
}
