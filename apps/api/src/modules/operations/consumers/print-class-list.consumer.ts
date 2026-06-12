import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintClassListConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-class-list.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-class-list' && event.payload.action_id !== 'print-class-list') {
      return;
    }

    // TODO: Implement domain logic for print-class-list
    console.log('[PrintClassListConsumer] Executing action:', event.payload);
  }
}
