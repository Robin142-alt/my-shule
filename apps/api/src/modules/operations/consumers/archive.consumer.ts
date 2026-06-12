import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ArchiveConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'archive.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'archive' && event.payload.action_id !== 'archive') {
      return;
    }

    // TODO: Implement domain logic for archive
    console.log('[ArchiveConsumer] Executing action:', event.payload);
  }
}
