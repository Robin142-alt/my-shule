import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class CreateStudentProfileConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'create-student-profile.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'create-student-profile' && event.payload.action_id !== 'create-student-profile') {
      return;
    }

    // TODO: Implement domain logic for create-student-profile
    console.log('[CreateStudentProfileConsumer] Executing action:', event.payload);
  }
}
