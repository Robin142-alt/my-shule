import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SendSmsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'send-sms.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'send-sms' && event.payload.action_id !== 'send-sms') {
      return;
    }

    // TODO: Implement domain logic for send-sms
    console.log('[SendSmsConsumer] Executing action:', event.payload);
  }
}
