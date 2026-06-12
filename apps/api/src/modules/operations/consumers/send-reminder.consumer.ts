import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SendReminderConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'send-reminder.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'send-reminder' && event.payload.action_id !== 'send-reminder') {
      return;
    }

    // TODO: Implement domain logic for send-reminder
    console.log('[SendReminderConsumer] Executing action:', event.payload);
  }
}
