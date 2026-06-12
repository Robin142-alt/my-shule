import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintIssueVoucherConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-issue-voucher.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-issue-voucher' && event.payload.action_id !== 'print-issue-voucher') {
      return;
    }

    // TODO: Implement domain logic for print-issue-voucher
    console.log('[PrintIssueVoucherConsumer] Executing action:', event.payload);
  }
}
