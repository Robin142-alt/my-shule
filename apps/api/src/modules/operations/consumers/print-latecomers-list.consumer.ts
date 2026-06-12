import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintLatecomersListConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-latecomers-list.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-latecomers-list' && event.payload.action_id !== 'print-latecomers-list') {
      return;
    }

    // TODO: Implement domain logic for print-latecomers-list
    console.log('[PrintLatecomersListConsumer] Executing action:', event.payload);
  }
}
