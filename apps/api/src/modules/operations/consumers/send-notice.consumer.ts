import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SendNoticeConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'send-notice.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'send-notice' && event.payload.action_id !== 'send-notice') {
      return;
    }

    // TODO: Implement domain logic for send-notice
    console.log('[SendNoticeConsumer] Executing action:', event.payload);
  }
}
