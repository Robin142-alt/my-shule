import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ViewTeacherConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'view-teacher.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'view-teacher' && event.payload.action_id !== 'view-teacher') {
      return;
    }

    // TODO: Implement domain logic for view-teacher
    console.log('[ViewTeacherConsumer] Executing action:', event.payload);
  }
}
