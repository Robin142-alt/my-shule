import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class NewAppointmentConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'new-appointment.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'new-appointment' && event.payload.action_id !== 'new-appointment') {
      return;
    }

    // TODO: Implement domain logic for new-appointment
    console.log('[NewAppointmentConsumer] Executing action:', event.payload);
  }
}
