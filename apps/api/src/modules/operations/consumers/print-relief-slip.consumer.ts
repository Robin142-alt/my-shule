import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintReliefSlipConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-relief-slip.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-relief-slip' && event.payload.action_id !== 'print-relief-slip') {
      return;
    }

    // TODO: Implement domain logic for print-relief-slip
    console.log('[PrintReliefSlipConsumer] Executing action:', event.payload);
  }
}
