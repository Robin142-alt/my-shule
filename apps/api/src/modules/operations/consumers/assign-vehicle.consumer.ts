import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AssignVehicleConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'assign-vehicle.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'assign-vehicle' && event.payload.action_id !== 'assign-vehicle') {
      return;
    }

    // TODO: Implement domain logic for assign-vehicle
    console.log('[AssignVehicleConsumer] Executing action:', event.payload);
  }
}
