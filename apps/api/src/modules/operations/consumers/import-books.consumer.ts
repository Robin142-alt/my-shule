import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ImportBooksConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'import-books.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'import-books' && event.payload.action_id !== 'import-books') {
      return;
    }

    // TODO: Implement domain logic for import-books
    console.log('[ImportBooksConsumer] Executing action:', event.payload);
  }
}
