import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class UnpublishWithApprovalConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'unpublish-with-approval.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'unpublish-with-approval' && event.payload.action_id !== 'unpublish-with-approval') {
      return;
    }

    // TODO: Implement domain logic for unpublish-with-approval
    console.log('[UnpublishWithApprovalConsumer] Executing action:', event.payload);
  }
}
