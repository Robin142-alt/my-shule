import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintIssueSlipConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-issue-slip.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-issue-slip' && event.payload.action_id !== 'print-issue-slip') {
      return;
    }

    // TODO: Implement domain logic for print-issue-slip
    console.log('[PrintIssueSlipConsumer] Executing action:', event.payload);
  }
}
