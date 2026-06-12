import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ViewInviteStatusConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'view-invite-status.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'view-invite-status' && event.payload.action_id !== 'view-invite-status') {
      return;
    }

    // TODO: Implement domain logic for view-invite-status
    console.log('[ViewInviteStatusConsumer] Executing action:', event.payload);
  }
}
