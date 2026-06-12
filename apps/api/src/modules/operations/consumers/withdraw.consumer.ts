import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class WithdrawConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'withdraw.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'withdraw' && event.payload.action_id !== 'withdraw') {
      return;
    }

    // TODO: Implement domain logic for withdraw
    console.log('[WithdrawConsumer] Executing action:', event.payload);
  }
}
