import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class RemindTeacherConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'remind-teacher.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'remind-teacher' && event.payload.action_id !== 'remind-teacher') {
      return;
    }

    // TODO: Implement domain logic for remind-teacher
    console.log('[RemindTeacherConsumer] Executing action:', event.payload);
  }
}
