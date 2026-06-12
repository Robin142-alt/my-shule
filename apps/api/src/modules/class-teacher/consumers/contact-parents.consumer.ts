import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ContactParentsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'contact-parents.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'contact-parents' && event.payload.action_id !== 'contact-parents') {
      return;
    }

    // TODO: Implement domain logic for contact-parents
    console.log('[ContactParentsConsumer] Executing action:', event.payload);
  }
}
