import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintVisitSlipConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-visit-slip.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-visit-slip' && event.payload.action_id !== 'print-visit-slip') {
      return;
    }

    // TODO: Implement domain logic for print-visit-slip
    console.log('[PrintVisitSlipConsumer] Executing action:', event.payload);
  }
}
