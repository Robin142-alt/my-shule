import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SubmitMarksConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'submit-marks.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'submit-marks' && event.payload.action_id !== 'submit-marks') {
      return;
    }

    // TODO: Implement domain logic for submit-marks
    console.log('[SubmitMarksConsumer] Executing action:', event.payload);
  }
}
