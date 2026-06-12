import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class DownloadReportsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'download-reports.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'download-reports' && event.payload.action_id !== 'download-reports') {
      return;
    }

    // TODO: Implement domain logic for download-reports
    console.log('[DownloadReportsConsumer] Executing action:', event.payload);
  }
}
