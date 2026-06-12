import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class IssueWarningLetterConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'issue-warning-letter.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'issue-warning-letter' && event.payload.action_id !== 'issue-warning-letter') {
      return;
    }

    // TODO: Implement domain logic for issue-warning-letter
    console.log('[IssueWarningLetterConsumer] Executing action:', event.payload);
  }
}
