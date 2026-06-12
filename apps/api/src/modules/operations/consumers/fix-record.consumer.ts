import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class FixRecordConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'fix-record.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'fix-record' && event.payload.action_id !== 'fix-record') {
      return;
    }

    // TODO: Implement domain logic for fix-record
    console.log('[FixRecordConsumer] Executing action:', event.payload);
  }
}
