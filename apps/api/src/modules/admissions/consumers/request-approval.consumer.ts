import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class RequestApprovalConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'request-approval.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'request-approval' && event.payload.action_id !== 'request-approval') {
      return;
    }

    // TODO: Implement domain logic for request-approval
    console.log('[RequestApprovalConsumer] Executing action:', event.payload);
  }
}
