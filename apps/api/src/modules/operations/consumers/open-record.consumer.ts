import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class OpenRecordConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'open-record.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'open-record' && event.payload.action_id !== 'open-record') {
      return;
    }

    // TODO: Implement domain logic for open-record
    console.log('[OpenRecordConsumer] Executing action:', event.payload);
  }
}
