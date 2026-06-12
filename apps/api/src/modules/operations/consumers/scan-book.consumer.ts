import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ScanBookConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'scan-book.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'scan-book' && event.payload.action_id !== 'scan-book') {
      return;
    }

    // TODO: Implement domain logic for scan-book
    console.log('[ScanBookConsumer] Executing action:', event.payload);
  }
}
