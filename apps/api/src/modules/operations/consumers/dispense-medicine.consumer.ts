import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class DispenseMedicineConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'dispense-medicine.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'dispense-medicine' && event.payload.action_id !== 'dispense-medicine') {
      return;
    }

    // TODO: Implement domain logic for dispense-medicine
    console.log('[DispenseMedicineConsumer] Executing action:', event.payload);
  }
}
