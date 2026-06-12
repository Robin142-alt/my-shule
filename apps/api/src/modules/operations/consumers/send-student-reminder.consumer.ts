import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SendStudentReminderConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'send-student-reminder.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'send-student-reminder' && event.payload.action_id !== 'send-student-reminder') {
      return;
    }

    // TODO: Implement domain logic for send-student-reminder
    console.log('[SendStudentReminderConsumer] Executing action:', event.payload);
  }
}
