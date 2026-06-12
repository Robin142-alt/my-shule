import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ViewStudentProfileConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'view-student-profile.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'view-student-profile' && event.payload.action_id !== 'view-student-profile') {
      return;
    }

    // TODO: Implement domain logic for view-student-profile
    console.log('[ViewStudentProfileConsumer] Executing action:', event.payload);
  }
}
