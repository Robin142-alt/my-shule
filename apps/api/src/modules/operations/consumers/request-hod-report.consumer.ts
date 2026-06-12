import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class RequestHodReportConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'request-hod-report.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'request-hod-report' && event.payload.action_id !== 'request-hod-report') {
      return;
    }

    // TODO: Implement domain logic for request-hod-report
    console.log('[RequestHodReportConsumer] Executing action:', event.payload);
  }
}
