import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ShareInternallyConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'share-internally.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'share-internally' && event.payload.action_id !== 'share-internally') {
      return;
    }

    // TODO: Implement domain logic for share-internally
    console.log('[ShareInternallyConsumer] Executing action:', event.payload);
  }
}
