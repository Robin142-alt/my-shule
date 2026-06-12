import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class CreateAppointmentConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'create-appointment.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'create-appointment' && event.payload.action_id !== 'create-appointment') {
      return;
    }

    // TODO: Implement domain logic for create-appointment
    console.log('[CreateAppointmentConsumer] Executing action:', event.payload);
  }
}
