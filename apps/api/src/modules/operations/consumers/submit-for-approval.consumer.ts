import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SubmitForApprovalConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'submit-for-approval.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'submit-for-approval' && event.payload.action_id !== 'submit-for-approval') {
      return;
    }

    // TODO: Implement domain logic for submit-for-approval
    console.log('[SubmitForApprovalConsumer] Executing action:', event.payload);
  }
}
