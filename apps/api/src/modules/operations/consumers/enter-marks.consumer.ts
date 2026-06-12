import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class EnterMarksConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'enter-marks.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'enter-marks' && event.payload.action_id !== 'enter-marks') {
      return;
    }

    // TODO: Implement domain logic for enter-marks
    console.log('[EnterMarksConsumer] Executing action:', event.payload);
  }
}
