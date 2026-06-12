import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintQueueSlipConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-queue-slip.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-queue-slip' && event.payload.action_id !== 'print-queue-slip') {
      return;
    }

    // TODO: Implement domain logic for print-queue-slip
    console.log('[PrintQueueSlipConsumer] Executing action:', event.payload);
  }
}
