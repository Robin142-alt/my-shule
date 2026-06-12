import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class CloseYearConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'close-year.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'close-year' && event.payload.action_id !== 'close-year') {
      return;
    }

    // TODO: Implement domain logic for close-year
    console.log('[CloseYearConsumer] Executing action:', event.payload);
  }
}
