import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class CopyInviteLinkConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'copy-invite-link.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'copy-invite-link' && event.payload.action_id !== 'copy-invite-link') {
      return;
    }

    // TODO: Implement domain logic for copy-invite-link
    console.log('[CopyInviteLinkConsumer] Executing action:', event.payload);
  }
}
