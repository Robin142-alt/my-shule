import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintJoiningSlipConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-joining-slip.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-joining-slip' && event.payload.action_id !== 'print-joining-slip') {
      return;
    }

    // TODO: Implement domain logic for print-joining-slip
    console.log('[PrintJoiningSlipConsumer] Executing action:', event.payload);
  }
}
