import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class IssueStockConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'issue-stock.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'issue-stock' && event.payload.action_id !== 'issue-stock') {
      return;
    }

    // TODO: Implement domain logic for issue-stock
    console.log('[IssueStockConsumer] Executing action:', event.payload);
  }
}
