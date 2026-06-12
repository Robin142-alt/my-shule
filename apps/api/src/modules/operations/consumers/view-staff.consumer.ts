import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ViewStaffConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'view-staff.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'view-staff' && event.payload.action_id !== 'view-staff') {
      return;
    }

    // TODO: Implement domain logic for view-staff
    console.log('[ViewStaffConsumer] Executing action:', event.payload);
  }
}
