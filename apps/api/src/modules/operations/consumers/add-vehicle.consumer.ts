import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AddVehicleConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'add-vehicle.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'add-vehicle' && event.payload.action_id !== 'add-vehicle') {
      return;
    }

    // TODO: Implement domain logic for add-vehicle
    console.log('[AddVehicleConsumer] Executing action:', event.payload);
  }
}
