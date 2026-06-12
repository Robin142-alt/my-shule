import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintStaffDutyListConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-staff-duty-list.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-staff-duty-list' && event.payload.action_id !== 'print-staff-duty-list') {
      return;
    }

    // TODO: Implement domain logic for print-staff-duty-list
    console.log('[PrintStaffDutyListConsumer] Executing action:', event.payload);
  }
}
