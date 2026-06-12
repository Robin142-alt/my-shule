import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AssignTeachersConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'assign-teachers.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'assign-teachers' && event.payload.action_id !== 'assign-teachers') {
      return;
    }

    // TODO: Implement domain logic for assign-teachers
    console.log('[AssignTeachersConsumer] Executing action:', event.payload);
  }
}
