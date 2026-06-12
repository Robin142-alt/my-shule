import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class GradeAssignmentConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'grade-assignment.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'grade-assignment' && event.payload.action_id !== 'grade-assignment') {
      return;
    }

    // TODO: Implement domain logic for grade-assignment
    console.log('[GradeAssignmentConsumer] Executing action:', event.payload);
  }
}
