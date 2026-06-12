import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class UploadLogoConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'upload-logo.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'upload-logo' && event.payload.action_id !== 'upload-logo') {
      return;
    }

    // TODO: Implement domain logic for upload-logo
    console.log('[UploadLogoConsumer] Executing action:', event.payload);
  }
}
