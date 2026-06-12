import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class OpenStudentProfileConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'open-student-profile.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'open-student-profile' && event.payload.action_id !== 'open-student-profile') {
      return;
    }

    // TODO: Implement domain logic for open-student-profile
    console.log('[OpenStudentProfileConsumer] Executing action:', event.payload);
  }
}
