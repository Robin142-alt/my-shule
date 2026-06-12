import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class DisableStaffConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'disable-staff.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'disable-staff' && event.payload.action_id !== 'disable-staff') {
      return;
    }

    // TODO: Implement domain logic for disable-staff
    console.log('[DisableStaffConsumer] Executing action:', event.payload);
  }
}
