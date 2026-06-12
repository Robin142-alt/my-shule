import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ViewDecisionHistoryConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'view-decision-history.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'view-decision-history' && event.payload.action_id !== 'view-decision-history') {
      return;
    }

    // TODO: Implement domain logic for view-decision-history
    console.log('[ViewDecisionHistoryConsumer] Executing action:', event.payload);
  }
}
