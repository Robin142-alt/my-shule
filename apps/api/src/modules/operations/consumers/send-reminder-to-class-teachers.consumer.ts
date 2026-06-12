import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SendReminderToClassTeachersConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'send-reminder-to-class-teachers.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'send-reminder-to-class-teachers' && event.payload.action_id !== 'send-reminder-to-class-teachers') {
      return;
    }

    // TODO: Implement domain logic for send-reminder-to-class-teachers
    console.log('[SendReminderToClassTeachersConsumer] Executing action:', event.payload);
  }
}
