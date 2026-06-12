import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintDailyOperationsBriefConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-daily-operations-brief.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-daily-operations-brief' && event.payload.action_id !== 'print-daily-operations-brief') {
      return;
    }

    // TODO: Implement domain logic for print-daily-operations-brief
    console.log('[PrintDailyOperationsBriefConsumer] Executing action:', event.payload);
  }
}
