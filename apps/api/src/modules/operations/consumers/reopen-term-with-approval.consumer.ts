import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ReopenTermWithApprovalConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'reopen-term-with-approval.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'reopen-term-with-approval' && event.payload.action_id !== 'reopen-term-with-approval') {
      return;
    }

    // TODO: Implement domain logic for reopen-term-with-approval
    console.log('[ReopenTermWithApprovalConsumer] Executing action:', event.payload);
  }
}
