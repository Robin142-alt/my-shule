import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class IssueBookConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'issue-book.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'issue-book' && event.payload.action_id !== 'issue-book') {
      return;
    }

    // TODO: Implement domain logic for issue-book
    console.log('[IssueBookConsumer] Executing action:', event.payload);
  }
}
