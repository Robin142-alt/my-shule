import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class FilterConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'filter.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'filter' && event.payload.action_id !== 'filter') {
      return;
    }

    // TODO: Implement domain logic for filter
    console.log('[FilterConsumer] Executing action:', event.payload);
  }
}
