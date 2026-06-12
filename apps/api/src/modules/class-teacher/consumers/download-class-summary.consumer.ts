import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class DownloadClassSummaryConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'download-class-summary.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'download-class-summary' && event.payload.action_id !== 'download-class-summary') {
      return;
    }

    // TODO: Implement domain logic for download-class-summary
    console.log('[DownloadClassSummaryConsumer] Executing action:', event.payload);
  }
}
