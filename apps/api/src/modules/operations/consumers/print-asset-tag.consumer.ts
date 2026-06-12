import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintAssetTagConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-asset-tag.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-asset-tag' && event.payload.action_id !== 'print-asset-tag') {
      return;
    }

    // TODO: Implement domain logic for print-asset-tag
    console.log('[PrintAssetTagConsumer] Executing action:', event.payload);
  }
}
