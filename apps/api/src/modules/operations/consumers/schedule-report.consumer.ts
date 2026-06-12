import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ScheduleReportConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'schedule-report.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'schedule-report' && event.payload.action_id !== 'schedule-report') {
      return;
    }

    // TODO: Implement domain logic for schedule-report
    console.log('[ScheduleReportConsumer] Executing action:', event.payload);
  }
}
