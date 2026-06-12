import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AttachDeliveryNoteConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'attach-delivery-note.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'attach-delivery-note' && event.payload.action_id !== 'attach-delivery-note') {
      return;
    }

    // TODO: Implement domain logic for attach-delivery-note
    console.log('[AttachDeliveryNoteConsumer] Executing action:', event.payload);
  }
}
