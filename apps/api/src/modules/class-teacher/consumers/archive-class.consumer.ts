import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ArchiveClassConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'archive-class.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'archive-class' && event.payload.action_id !== 'archive-class') {
      return;
    }

    // TODO: Implement domain logic for archive-class
    console.log('[ArchiveClassConsumer] Executing action:', event.payload);
  }
}
