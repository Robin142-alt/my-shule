import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PromoteStudentsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'promote-students.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'promote-students' && event.payload.action_id !== 'promote-students') {
      return;
    }

    // TODO: Implement domain logic for promote-students
    console.log('[PromoteStudentsConsumer] Executing action:', event.payload);
  }
}
