import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SendPortalInvitesConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'send-portal-invites.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'send-portal-invites' && event.payload.action_id !== 'send-portal-invites') {
      return;
    }

    // TODO: Implement domain logic for send-portal-invites
    console.log('[SendPortalInvitesConsumer] Executing action:', event.payload);
  }
}
