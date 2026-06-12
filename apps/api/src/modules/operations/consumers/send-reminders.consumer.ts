import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SendRemindersConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'send-reminders.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'send-reminders' && event.payload.action_id !== 'send-reminders') {
      return;
    }

    // TODO: Implement domain logic for send-reminders
    console.log('[SendRemindersConsumer] Executing action:', event.payload);
  }
}
