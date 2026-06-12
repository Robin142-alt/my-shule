import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SendAnnouncementConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'send-announcement.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'send-announcement' && event.payload.action_id !== 'send-announcement') {
      return;
    }

    // TODO: Implement domain logic for send-announcement
    console.log('[SendAnnouncementConsumer] Executing action:', event.payload);
  }
}
