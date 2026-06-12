import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintTransferChecklistConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-transfer-checklist.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-transfer-checklist' && event.payload.action_id !== 'print-transfer-checklist') {
      return;
    }

    // TODO: Implement domain logic for print-transfer-checklist
    console.log('[PrintTransferChecklistConsumer] Executing action:', event.payload);
  }
}
