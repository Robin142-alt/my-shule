import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ImportSetupDataConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'import-setup-data.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'import-setup-data' && event.payload.action_id !== 'import-setup-data') {
      return;
    }

    // TODO: Implement domain logic for import-setup-data
    console.log('[ImportSetupDataConsumer] Executing action:', event.payload);
  }
}
