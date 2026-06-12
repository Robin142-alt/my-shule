import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class WaitlistConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'waitlist.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'waitlist' && event.payload.action_id !== 'waitlist') {
      return;
    }

    // TODO: Implement domain logic for waitlist
    console.log('[WaitlistConsumer] Executing action:', event.payload);
  }
}
