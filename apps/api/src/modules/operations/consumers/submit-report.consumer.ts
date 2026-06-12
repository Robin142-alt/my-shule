import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SubmitReportConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'submit-report.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'submit-report' && event.payload.action_id !== 'submit-report') {
      return;
    }

    // TODO: Implement domain logic for submit-report
    console.log('[SubmitReportConsumer] Executing action:', event.payload);
  }
}
