import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ApproveResultsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'approve-results.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'approve-results' && event.payload.action_id !== 'approve-results') {
      return;
    }

    // TODO: Implement domain logic for approve-results
    console.log('[ApproveResultsConsumer] Executing action:', event.payload);
  }
}
