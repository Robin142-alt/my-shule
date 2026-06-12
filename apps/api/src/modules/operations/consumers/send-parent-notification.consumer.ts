import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SendParentNotificationConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'send-parent-notification.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'send-parent-notification' && event.payload.action_id !== 'send-parent-notification') {
      return;
    }

    // TODO: Implement domain logic for send-parent-notification
    console.log('[SendParentNotificationConsumer] Executing action:', event.payload);
  }
}
