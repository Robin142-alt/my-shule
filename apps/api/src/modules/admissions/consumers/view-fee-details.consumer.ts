import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ViewFeeDetailsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'view-fee-details.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'view-fee-details' && event.payload.action_id !== 'view-fee-details') {
      return;
    }

    // TODO: Implement domain logic for view-fee-details
    console.log('[ViewFeeDetailsConsumer] Executing action:', event.payload);
  }
}
