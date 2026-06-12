import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ResendSetupReminderConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'resend-setup-reminder.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'resend-setup-reminder' && event.payload.action_id !== 'resend-setup-reminder') {
      return;
    }

    // TODO: Implement domain logic for resend-setup-reminder
    console.log('[ResendSetupReminderConsumer] Executing action:', event.payload);
  }
}
