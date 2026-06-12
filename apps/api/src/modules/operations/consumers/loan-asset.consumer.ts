import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class LoanAssetConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'loan-asset.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'loan-asset' && event.payload.action_id !== 'loan-asset') {
      return;
    }

    // TODO: Implement domain logic for loan-asset
    console.log('[LoanAssetConsumer] Executing action:', event.payload);
  }
}
