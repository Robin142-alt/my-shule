import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class InviteStaffConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'invite-staff.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'invite-staff' && event.payload.action_id !== 'invite-staff') {
      return;
    }

    // TODO: Implement domain logic for invite-staff
    console.log('[InviteStaffConsumer] Executing action:', event.payload);
  }
}
