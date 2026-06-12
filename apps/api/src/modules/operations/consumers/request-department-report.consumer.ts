import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class RequestDepartmentReportConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'request-department-report.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'request-department-report' && event.payload.action_id !== 'request-department-report') {
      return;
    }

    // TODO: Implement domain logic for request-department-report
    console.log('[RequestDepartmentReportConsumer] Executing action:', event.payload);
  }
}
