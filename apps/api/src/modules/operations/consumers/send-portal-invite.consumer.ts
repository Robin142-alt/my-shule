import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SendPortalInviteConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'send-portal-invite.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'send-portal-invite' && event.payload.action_id !== 'send-portal-invite') {
      return;
    }

    // TODO: Implement domain logic for send-portal-invite
    console.log('[SendPortalInviteConsumer] Executing action:', event.payload);
  }
}
