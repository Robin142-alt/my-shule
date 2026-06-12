import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class RejectWithdrawConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'reject-withdraw.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'reject-withdraw' && event.payload.action_id !== 'reject-withdraw') {
      return;
    }

    // TODO: Implement domain logic for reject-withdraw
    console.log('[RejectWithdrawConsumer] Executing action:', event.payload);
  }
}
