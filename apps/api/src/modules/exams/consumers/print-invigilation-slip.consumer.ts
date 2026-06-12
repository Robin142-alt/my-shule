import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintInvigilationSlipConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-invigilation-slip.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-invigilation-slip' && event.payload.action_id !== 'print-invigilation-slip') {
      return;
    }

    // TODO: Implement domain logic for print-invigilation-slip
    console.log('[PrintInvigilationSlipConsumer] Executing action:', event.payload);
  }
}
