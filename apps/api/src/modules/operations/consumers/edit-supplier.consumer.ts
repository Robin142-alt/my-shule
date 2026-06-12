import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class EditSupplierConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'edit-supplier.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'edit-supplier' && event.payload.action_id !== 'edit-supplier') {
      return;
    }

    // TODO: Implement domain logic for edit-supplier
    console.log('[EditSupplierConsumer] Executing action:', event.payload);
  }
}
