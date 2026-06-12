import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class DeactivateStudentConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'deactivate-student.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'deactivate-student' && event.payload.action_id !== 'deactivate-student') {
      return;
    }

    // TODO: Implement domain logic for deactivate-student
    console.log('[DeactivateStudentConsumer] Executing action:', event.payload);
  }
}
