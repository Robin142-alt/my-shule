import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SendFollowUpSmsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'send-follow-up-sms.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'send-follow-up-sms' && event.payload.action_id !== 'send-follow-up-sms') {
      return;
    }

    // TODO: Implement domain logic for send-follow-up-sms
    console.log('[SendFollowUpSmsConsumer] Executing action:', event.payload);
  }
}
