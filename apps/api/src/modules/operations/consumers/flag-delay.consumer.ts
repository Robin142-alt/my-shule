import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class FlagDelayConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'flag-delay.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'flag-delay' && event.payload.action_id !== 'flag-delay') {
      return;
    }

    // TODO: Implement domain logic for flag-delay
    console.log('[FlagDelayConsumer] Executing action:', event.payload);
  }
}
