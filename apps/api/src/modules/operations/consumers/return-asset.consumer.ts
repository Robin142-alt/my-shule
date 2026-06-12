import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ReturnAssetConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'return-asset.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'return-asset' && event.payload.action_id !== 'return-asset') {
      return;
    }

    // TODO: Implement domain logic for return-asset
    console.log('[ReturnAssetConsumer] Executing action:', event.payload);
  }
}
