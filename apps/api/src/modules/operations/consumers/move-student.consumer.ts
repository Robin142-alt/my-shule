import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class MoveStudentConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'move-student.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'move-student' && event.payload.action_id !== 'move-student') {
      return;
    }

    // TODO: Implement domain logic for move-student
    console.log('[MoveStudentConsumer] Executing action:', event.payload);
  }
}
