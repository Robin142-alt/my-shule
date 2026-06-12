import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ImportAssetsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'import-assets.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'import-assets' && event.payload.action_id !== 'import-assets') {
      return;
    }

    // TODO: Implement domain logic for import-assets
    console.log('[ImportAssetsConsumer] Executing action:', event.payload);
  }
}
