import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AddMedicineConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'add-medicine.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'add-medicine' && event.payload.action_id !== 'add-medicine') {
      return;
    }

    // TODO: Implement domain logic for add-medicine
    console.log('[AddMedicineConsumer] Executing action:', event.payload);
  }
}
