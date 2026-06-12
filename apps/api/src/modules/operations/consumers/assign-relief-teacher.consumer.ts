import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AssignReliefTeacherConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'assign-relief-teacher.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'assign-relief-teacher' && event.payload.action_id !== 'assign-relief-teacher') {
      return;
    }

    // TODO: Implement domain logic for assign-relief-teacher
    console.log('[AssignReliefTeacherConsumer] Executing action:', event.payload);
  }
}
