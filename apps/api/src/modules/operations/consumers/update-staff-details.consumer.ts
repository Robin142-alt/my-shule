import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class UpdateStaffDetailsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'update-staff-details.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'update-staff-details' && event.payload.action_id !== 'update-staff-details') {
      return;
    }

    // TODO: Implement domain logic for update-staff-details
    console.log('[UpdateStaffDetailsConsumer] Executing action:', event.payload);
  }
}
