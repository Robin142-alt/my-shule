import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class EnterMyMarksConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'enter-my-marks.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'enter-my-marks' && event.payload.action_id !== 'enter-my-marks') {
      return;
    }

    // TODO: Implement domain logic for enter-my-marks
    console.log('[EnterMyMarksConsumer] Executing action:', event.payload);
  }
}
