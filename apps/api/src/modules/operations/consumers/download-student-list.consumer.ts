import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class DownloadStudentListConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'download-student-list.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'download-student-list' && event.payload.action_id !== 'download-student-list') {
      return;
    }

    // TODO: Implement domain logic for download-student-list
    console.log('[DownloadStudentListConsumer] Executing action:', event.payload);
  }
}
