import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class UploadFileConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'upload-file.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'upload-file' && event.payload.action_id !== 'upload-file') {
      return;
    }

    // TODO: Implement domain logic for upload-file
    console.log('[UploadFileConsumer] Executing action:', event.payload);
  }
}
