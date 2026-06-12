import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AddStudentConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'add-student.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'add-student' && event.payload.action_id !== 'add-student') {
      return;
    }

    // TODO: Implement domain logic for add-student
    console.log('[AddStudentConsumer] Executing action:', event.payload);
  }
}
