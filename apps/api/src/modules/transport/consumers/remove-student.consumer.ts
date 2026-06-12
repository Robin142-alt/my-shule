import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class RemoveStudentConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'remove-student.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'remove-student' && event.payload.action_id !== 'remove-student') {
      return;
    }

    // TODO: Implement domain logic for remove-student
    console.log('[RemoveStudentConsumer] Executing action:', event.payload);
  }
}
