import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class DownloadSchoolProfileConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'download-school-profile.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'download-school-profile' && event.payload.action_id !== 'download-school-profile') {
      return;
    }

    // TODO: Implement domain logic for download-school-profile
    console.log('[DownloadSchoolProfileConsumer] Executing action:', event.payload);
  }
}
