import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class TransferConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'transfer.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'transfer' && event.payload.action_id !== 'transfer') {
      return;
    }

    // TODO: Implement domain logic for transfer
    console.log('[TransferConsumer] Executing action:', event.payload);
  }
}
