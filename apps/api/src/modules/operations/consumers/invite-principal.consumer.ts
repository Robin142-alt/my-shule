import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class InvitePrincipalConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'invite-principal.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'invite-principal' && event.payload.action_id !== 'invite-principal') {
      return;
    }

    // TODO: Implement domain logic for invite-principal
    console.log('[InvitePrincipalConsumer] Executing action:', event.payload);
  }
}
