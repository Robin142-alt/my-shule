import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class UploadMarksConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'upload-marks.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'upload-marks' && event.payload.action_id !== 'upload-marks') {
      return;
    }

    // TODO: Implement domain logic for upload-marks
    console.log('[UploadMarksConsumer] Executing action:', event.payload);
  }
}
