import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintSelectedConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-selected.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-selected' && event.payload.action_id !== 'print-selected') {
      return;
    }

    // TODO: Implement domain logic for print-selected
    console.log('[PrintSelectedConsumer] Executing action:', event.payload);
  }
}
