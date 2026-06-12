import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class MessageClassTeacherConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'message-class-teacher.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'message-class-teacher' && event.payload.action_id !== 'message-class-teacher') {
      return;
    }

    // TODO: Implement domain logic for message-class-teacher
    console.log('[MessageClassTeacherConsumer] Executing action:', event.payload);
  }
}
