import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class DownloadSetupGapsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'download-setup-gaps.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'download-setup-gaps' && event.payload.action_id !== 'download-setup-gaps') {
      return;
    }

    // TODO: Implement domain logic for download-setup-gaps
    console.log('[DownloadSetupGapsConsumer] Executing action:', event.payload);
  }
}
