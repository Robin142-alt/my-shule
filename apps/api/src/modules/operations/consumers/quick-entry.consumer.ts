import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class QuickEntryConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'quick-entry.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'quick-entry' && event.payload.action_id !== 'quick-entry') {
      return;
    }

    // TODO: Implement domain logic for quick-entry
    console.log('[QuickEntryConsumer] Executing action:', event.payload);
  }
}
