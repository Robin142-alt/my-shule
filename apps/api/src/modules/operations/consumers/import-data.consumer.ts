import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ImportDataConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'import-data.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'import-data' && event.payload.action_id !== 'import-data') {
      return;
    }

    // TODO: Implement domain logic for import-data
    console.log('[ImportDataConsumer] Executing action:', event.payload);
  }
}
