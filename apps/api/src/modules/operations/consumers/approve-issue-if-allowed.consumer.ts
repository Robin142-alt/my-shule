import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ApproveIssueIfAllowedConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'approve-issue-if-allowed.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'approve-issue-if-allowed' && event.payload.action_id !== 'approve-issue-if-allowed') {
      return;
    }

    // TODO: Implement domain logic for approve-issue-if-allowed
    console.log('[ApproveIssueIfAllowedConsumer] Executing action:', event.payload);
  }
}
