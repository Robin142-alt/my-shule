import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ArchiveYearConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'archive-year.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'archive-year' && event.payload.action_id !== 'archive-year') {
      return;
    }

    // TODO: Implement domain logic for archive-year
    console.log('[ArchiveYearConsumer] Executing action:', event.payload);
  }
}
