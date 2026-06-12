import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class NotifyStaffConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'notify-staff.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'notify-staff' && event.payload.action_id !== 'notify-staff') {
      return;
    }

    // TODO: Implement domain logic for notify-staff
    console.log('[NotifyStaffConsumer] Executing action:', event.payload);
  }
}
