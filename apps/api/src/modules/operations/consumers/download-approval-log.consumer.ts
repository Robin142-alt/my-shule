import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class DownloadApprovalLogConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'download-approval-log.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'download-approval-log' && event.payload.action_id !== 'download-approval-log') {
      return;
    }

    // TODO: Implement domain logic for download-approval-log
    console.log('[DownloadApprovalLogConsumer] Executing action:', event.payload);
  }
}
