import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class DownloadAssignmentConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'download-assignment.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'download-assignment' && event.payload.action_id !== 'download-assignment') {
      return;
    }

    // TODO: Implement domain logic for download-assignment
    console.log('[DownloadAssignmentConsumer] Executing action:', event.payload);
  }
}
