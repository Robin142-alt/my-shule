import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintGoodsReceivedNoteConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-goods-received-note.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-goods-received-note' && event.payload.action_id !== 'print-goods-received-note') {
      return;
    }

    // TODO: Implement domain logic for print-goods-received-note
    console.log('[PrintGoodsReceivedNoteConsumer] Executing action:', event.payload);
  }
}
