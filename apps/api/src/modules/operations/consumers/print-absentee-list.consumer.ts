import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintAbsenteeListConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-absentee-list.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-absentee-list' && event.payload.action_id !== 'print-absentee-list') {
      return;
    }

    // TODO: Implement domain logic for print-absentee-list
    console.log('[PrintAbsenteeListConsumer] Executing action:', event.payload);
  }
}
