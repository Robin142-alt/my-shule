import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AssignStaffConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'assign-staff.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'assign-staff' && event.payload.action_id !== 'assign-staff') {
      return;
    }

    // TODO: Implement domain logic for assign-staff
    console.log('[AssignStaffConsumer] Executing action:', event.payload);
  }
}
