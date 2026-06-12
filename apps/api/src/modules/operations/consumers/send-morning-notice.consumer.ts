import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SendMorningNoticeConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'send-morning-notice.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'send-morning-notice' && event.payload.action_id !== 'send-morning-notice') {
      return;
    }

    // TODO: Implement domain logic for send-morning-notice
    console.log('[SendMorningNoticeConsumer] Executing action:', event.payload);
  }
}
