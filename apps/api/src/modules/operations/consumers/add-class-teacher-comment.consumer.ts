import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AddClassTeacherCommentConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'add-class-teacher-comment.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'add-class-teacher-comment' && event.payload.action_id !== 'add-class-teacher-comment') {
      return;
    }

    // TODO: Implement domain logic for add-class-teacher-comment
    console.log('[AddClassTeacherCommentConsumer] Executing action:', event.payload);
  }
}
