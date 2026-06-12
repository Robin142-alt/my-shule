import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintListConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-list.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-list' && event.payload.action_id !== 'print-list') {
      return;
    }

    // TODO: Implement domain logic for print-list
    console.log('[PrintListConsumer] Executing action:', event.payload);
  }
}
