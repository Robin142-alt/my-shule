import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ImportStatementConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'import-statement.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'import-statement' && event.payload.action_id !== 'import-statement') {
      return;
    }

    // TODO: Implement domain logic for import-statement
    console.log('[ImportStatementConsumer] Executing action:', event.payload);
  }
}
