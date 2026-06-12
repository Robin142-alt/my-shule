import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class EditStudentConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'edit-student.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'edit-student' && event.payload.action_id !== 'edit-student') {
      return;
    }

    // TODO: Implement domain logic for edit-student
    console.log('[EditStudentConsumer] Executing action:', event.payload);
  }
}
