import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintClassListsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-class-lists.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-class-lists' && event.payload.action_id !== 'print-class-lists') {
      return;
    }

    // TODO: Implement domain logic for print-class-lists
    console.log('[PrintClassListsConsumer] Executing action:', event.payload);
  }
}
