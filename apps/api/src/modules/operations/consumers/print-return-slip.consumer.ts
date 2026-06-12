import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintReturnSlipConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-return-slip.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-return-slip' && event.payload.action_id !== 'print-return-slip') {
      return;
    }

    // TODO: Implement domain logic for print-return-slip
    console.log('[PrintReturnSlipConsumer] Executing action:', event.payload);
  }
}
