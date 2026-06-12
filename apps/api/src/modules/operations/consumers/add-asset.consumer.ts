import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AddAssetConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'add-asset.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'add-asset' && event.payload.action_id !== 'add-asset') {
      return;
    }

    // TODO: Implement domain logic for add-asset
    console.log('[AddAssetConsumer] Executing action:', event.payload);
  }
}
