import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AssignTeacherConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'assign-teacher.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'assign-teacher' && event.payload.action_id !== 'assign-teacher') {
      return;
    }

    // TODO: Implement domain logic for assign-teacher
    console.log('[AssignTeacherConsumer] Executing action:', event.payload);
  }
}
