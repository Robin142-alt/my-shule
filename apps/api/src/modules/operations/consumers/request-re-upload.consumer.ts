import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class RequestReUploadConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'request-re-upload.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'request-re-upload' && event.payload.action_id !== 'request-re-upload') {
      return;
    }

    // TODO: Implement domain logic for request-re-upload
    console.log('[RequestReUploadConsumer] Executing action:', event.payload);
  }
}
