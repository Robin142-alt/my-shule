import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintStatementConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-statement.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-statement' && event.payload.action_id !== 'print-statement') {
      return;
    }

    // TODO: Implement domain logic for print-statement
    console.log('[PrintStatementConsumer] Executing action:', event.payload);
  }
}
