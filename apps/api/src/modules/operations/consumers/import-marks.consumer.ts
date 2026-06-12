import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ImportMarksConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'import-marks.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'import-marks' && event.payload.action_id !== 'import-marks') {
      return;
    }

    // TODO: Implement domain logic for import-marks
    console.log('[ImportMarksConsumer] Executing action:', event.payload);
  }
}
