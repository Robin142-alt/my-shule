import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AssignStudentConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'assign-student.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'assign-student' && event.payload.action_id !== 'assign-student') {
      return;
    }

    // TODO: Implement domain logic for assign-student
    console.log('[AssignStudentConsumer] Executing action:', event.payload);
  }
}
