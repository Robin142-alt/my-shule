import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class DownloadBusListConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'download-bus-list.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'download-bus-list' && event.payload.action_id !== 'download-bus-list') {
      return;
    }

    // TODO: Implement domain logic for download-bus-list
    console.log('[DownloadBusListConsumer] Executing action:', event.payload);
  }
}
