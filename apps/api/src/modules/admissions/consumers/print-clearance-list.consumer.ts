import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintClearanceListConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-clearance-list.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-clearance-list' && event.payload.action_id !== 'print-clearance-list') {
      return;
    }

    // TODO: Implement domain logic for print-clearance-list
    console.log('[PrintClearanceListConsumer] Executing action:', event.payload);
  }
}
