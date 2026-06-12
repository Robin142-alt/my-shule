import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class IssueItemConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'issue-item.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'issue-item' && event.payload.action_id !== 'issue-item') {
      return;
    }

    // TODO: Implement domain logic for issue-item
    console.log('[IssueItemConsumer] Executing action:', event.payload);
  }
}
