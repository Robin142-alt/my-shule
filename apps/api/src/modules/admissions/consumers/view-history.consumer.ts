import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ViewHistoryConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'view-history.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'view-history' && event.payload.action_id !== 'view-history') {
      return;
    }

    // TODO: Implement domain logic for view-history
    console.log('[ViewHistoryConsumer] Executing action:', event.payload);
  }
}
