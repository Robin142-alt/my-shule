import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ImportValidRowsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'import-valid-rows.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'import-valid-rows' && event.payload.action_id !== 'import-valid-rows') {
      return;
    }

    // TODO: Implement domain logic for import-valid-rows
    console.log('[ImportValidRowsConsumer] Executing action:', event.payload);
  }
}
