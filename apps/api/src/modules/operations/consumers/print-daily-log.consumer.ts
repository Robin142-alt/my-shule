import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintDailyLogConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-daily-log.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-daily-log' && event.payload.action_id !== 'print-daily-log') {
      return;
    }

    // TODO: Implement domain logic for print-daily-log
    console.log('[PrintDailyLogConsumer] Executing action:', event.payload);
  }
}
