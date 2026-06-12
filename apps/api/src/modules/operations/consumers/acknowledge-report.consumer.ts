import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AcknowledgeReportConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'acknowledge-report.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'acknowledge-report' && event.payload.action_id !== 'acknowledge-report') {
      return;
    }

    // TODO: Implement domain logic for acknowledge-report
    console.log('[AcknowledgeReportConsumer] Executing action:', event.payload);
  }
}
