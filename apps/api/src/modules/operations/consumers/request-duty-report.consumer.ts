import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class RequestDutyReportConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'request-duty-report.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'request-duty-report' && event.payload.action_id !== 'request-duty-report') {
      return;
    }

    // TODO: Implement domain logic for request-duty-report
    console.log('[RequestDutyReportConsumer] Executing action:', event.payload);
  }
}
