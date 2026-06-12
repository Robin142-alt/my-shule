import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class MessageClassTeachersConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'message-class-teachers.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'message-class-teachers' && event.payload.action_id !== 'message-class-teachers') {
      return;
    }

    // TODO: Implement domain logic for message-class-teachers
    console.log('[MessageClassTeachersConsumer] Executing action:', event.payload);
  }
}
