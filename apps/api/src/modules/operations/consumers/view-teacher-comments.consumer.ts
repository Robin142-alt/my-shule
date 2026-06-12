import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ViewTeacherCommentsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'view-teacher-comments.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'view-teacher-comments' && event.payload.action_id !== 'view-teacher-comments') {
      return;
    }

    // TODO: Implement domain logic for view-teacher-comments
    console.log('[ViewTeacherCommentsConsumer] Executing action:', event.payload);
  }
}
