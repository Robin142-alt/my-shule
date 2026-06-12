import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AssignAssetConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'assign-asset.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'assign-asset' && event.payload.action_id !== 'assign-asset') {
      return;
    }

    // TODO: Implement domain logic for assign-asset
    console.log('[AssignAssetConsumer] Executing action:', event.payload);
  }
}
