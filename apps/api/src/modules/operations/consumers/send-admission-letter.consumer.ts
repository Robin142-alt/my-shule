import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SendAdmissionLetterConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'send-admission-letter.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'send-admission-letter' && event.payload.action_id !== 'send-admission-letter') {
      return;
    }

    // TODO: Implement domain logic for send-admission-letter
    console.log('[SendAdmissionLetterConsumer] Executing action:', event.payload);
  }
}
