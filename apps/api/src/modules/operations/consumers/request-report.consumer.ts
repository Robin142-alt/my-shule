import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class RequestReportConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'request-report.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'request-report' && event.payload.action_id !== 'request-report') {
      return;
    }

    // TODO: Implement domain logic for request-report
    console.log('[RequestReportConsumer] Executing action:', event.payload);
  }
}
