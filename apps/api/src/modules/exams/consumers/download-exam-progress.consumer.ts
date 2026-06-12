import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class DownloadExamProgressConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'download-exam-progress.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'download-exam-progress' && event.payload.action_id !== 'download-exam-progress') {
      return;
    }

    // TODO: Implement domain logic for download-exam-progress
    console.log('[DownloadExamProgressConsumer] Executing action:', event.payload);
  }
}
