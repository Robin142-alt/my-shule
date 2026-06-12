import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class DownloadExcelConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'download-excel.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'download-excel' && event.payload.action_id !== 'download-excel') {
      return;
    }

    // TODO: Implement domain logic for download-excel
    console.log('[DownloadExcelConsumer] Executing action:', event.payload);
  }
}
