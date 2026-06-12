import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AddCoverageRecordConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'add-coverage-record.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'add-coverage-record' && event.payload.action_id !== 'add-coverage-record') {
      return;
    }

    // TODO: Implement domain logic for add-coverage-record
    console.log('[AddCoverageRecordConsumer] Executing action:', event.payload);
  }
}
