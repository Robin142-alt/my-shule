import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AssignClassTeacherConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'assign-class-teacher.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'assign-class-teacher' && event.payload.action_id !== 'assign-class-teacher') {
      return;
    }

    // TODO: Implement domain logic for assign-class-teacher
    console.log('[AssignClassTeacherConsumer] Executing action:', event.payload);
  }
}
