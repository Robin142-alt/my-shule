import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportModerationReportConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-moderation-report.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-moderation-report' && event.payload.action_id !== 'export-moderation-report') {
      return;
    }

    // TODO: Implement domain logic for export-moderation-report
    console.log('[ExportModerationReportConsumer] Executing action:', event.payload);
  }
}
