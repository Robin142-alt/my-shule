import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportPlatformReportConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-platform-report.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-platform-report' && event.payload.action_id !== 'export-platform-report') {
      return;
    }

    // TODO: Implement domain logic for export-platform-report
    console.log('[ExportPlatformReportConsumer] Executing action:', event.payload);
  }
}
