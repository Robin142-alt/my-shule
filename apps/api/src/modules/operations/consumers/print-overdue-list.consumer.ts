import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintOverdueListConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-overdue-list.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-overdue-list' && event.payload.action_id !== 'print-overdue-list') {
      return;
    }

    // TODO: Implement domain logic for print-overdue-list
    console.log('[PrintOverdueListConsumer] Executing action:', event.payload);
  }
}
