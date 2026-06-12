import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintDutySlipConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-duty-slip.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-duty-slip' && event.payload.action_id !== 'print-duty-slip') {
      return;
    }

    // TODO: Implement domain logic for print-duty-slip
    console.log('[PrintDutySlipConsumer] Executing action:', event.payload);
  }
}
