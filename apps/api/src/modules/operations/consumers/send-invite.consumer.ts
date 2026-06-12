import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SendInviteConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'send-invite.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'send-invite' && event.payload.action_id !== 'send-invite') {
      return;
    }

    // TODO: Implement domain logic for send-invite
    console.log('[SendInviteConsumer] Executing action:', event.payload);
  }
}
