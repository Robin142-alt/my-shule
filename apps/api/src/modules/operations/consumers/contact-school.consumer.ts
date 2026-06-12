import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ContactSchoolConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'contact-school.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'contact-school' && event.payload.action_id !== 'contact-school') {
      return;
    }

    // TODO: Implement domain logic for contact-school
    console.log('[ContactSchoolConsumer] Executing action:', event.payload);
  }
}
