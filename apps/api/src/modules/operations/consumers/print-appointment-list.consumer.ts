import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintAppointmentListConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-appointment-list.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-appointment-list' && event.payload.action_id !== 'print-appointment-list') {
      return;
    }

    // TODO: Implement domain logic for print-appointment-list
    console.log('[PrintAppointmentListConsumer] Executing action:', event.payload);
  }
}
