import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class GenerateDailySummaryConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'generate-daily-summary.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'generate-daily-summary' && event.payload.action_id !== 'generate-daily-summary') {
      return;
    }

    // TODO: Implement domain logic for generate-daily-summary
    console.log('[GenerateDailySummaryConsumer] Executing action:', event.payload);
  }
}
