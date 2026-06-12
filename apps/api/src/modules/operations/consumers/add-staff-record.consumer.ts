import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AddStaffRecordConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'add-staff-record.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'add-staff-record' && event.payload.action_id !== 'add-staff-record') {
      return;
    }

    // TODO: Implement domain logic for add-staff-record
    console.log('[AddStaffRecordConsumer] Executing action:', event.payload);
  }
}
