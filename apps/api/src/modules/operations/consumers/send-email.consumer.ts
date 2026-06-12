import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SendEmailConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'send-email.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'send-email' && event.payload.action_id !== 'send-email') {
      return;
    }

    // TODO: Implement domain logic for send-email
    console.log('[SendEmailConsumer] Executing action:', event.payload);
  }
}
