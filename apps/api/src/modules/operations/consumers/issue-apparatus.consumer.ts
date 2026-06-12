import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class IssueApparatusConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'issue-apparatus.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'issue-apparatus' && event.payload.action_id !== 'issue-apparatus') {
      return;
    }

    // TODO: Implement domain logic for issue-apparatus
    console.log('[IssueApparatusConsumer] Executing action:', event.payload);
  }
}
