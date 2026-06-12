import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ContactParentConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'contact-parent.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'contact-parent' && event.payload.action_id !== 'contact-parent') {
      return;
    }

    // TODO: Implement domain logic for contact-parent
    console.log('[ContactParentConsumer] Executing action:', event.payload);
  }
}
