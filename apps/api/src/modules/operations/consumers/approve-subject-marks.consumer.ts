import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ApproveSubjectMarksConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'approve-subject-marks.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'approve-subject-marks' && event.payload.action_id !== 'approve-subject-marks') {
      return;
    }

    // TODO: Implement domain logic for approve-subject-marks
    console.log('[ApproveSubjectMarksConsumer] Executing action:', event.payload);
  }
}
