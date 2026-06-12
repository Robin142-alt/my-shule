import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class VerifyContactConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'verify-contact.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'verify-contact' && event.payload.action_id !== 'verify-contact') {
      return;
    }

    // TODO: Implement domain logic for verify-contact
    console.log('[VerifyContactConsumer] Executing action:', event.payload);
  }
}
