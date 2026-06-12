import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SwapDutyConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'swap-duty.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'swap-duty' && event.payload.action_id !== 'swap-duty') {
      return;
    }

    // TODO: Implement domain logic for swap-duty
    console.log('[SwapDutyConsumer] Executing action:', event.payload);
  }
}
