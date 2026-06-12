import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class RevokeInviteConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'revoke-invite.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'revoke-invite' && event.payload.action_id !== 'revoke-invite') {
      return;
    }

    // TODO: Implement domain logic for revoke-invite
    console.log('[RevokeInviteConsumer] Executing action:', event.payload);
  }
}
