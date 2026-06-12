import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ResendInviteConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'resend-invite.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'resend-invite' && event.payload.action_id !== 'resend-invite') {
      return;
    }

    // TODO: Implement domain logic for resend-invite
    console.log('[ResendInviteConsumer] Executing action:', event.payload);
  }
}
