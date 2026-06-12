import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ValidateMarksConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'validate-marks.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'validate-marks' && event.payload.action_id !== 'validate-marks') {
      return;
    }

    // TODO: Implement domain logic for validate-marks
    console.log('[ValidateMarksConsumer] Executing action:', event.payload);
  }
}
