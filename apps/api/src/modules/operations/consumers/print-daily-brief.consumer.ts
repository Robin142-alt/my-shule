import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintDailyBriefConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-daily-brief.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-daily-brief' && event.payload.action_id !== 'print-daily-brief') {
      return;
    }

    // TODO: Implement domain logic for print-daily-brief
    console.log('[PrintDailyBriefConsumer] Executing action:', event.payload);
  }
}
