import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class UploadMarksCsvConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'upload-marks-csv.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'upload-marks-csv' && event.payload.action_id !== 'upload-marks-csv') {
      return;
    }

    // TODO: Implement domain logic for upload-marks-csv
    console.log('[UploadMarksCsvConsumer] Executing action:', event.payload);
  }
}
