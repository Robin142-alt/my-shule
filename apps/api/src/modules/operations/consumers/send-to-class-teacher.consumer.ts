import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SendToClassTeacherConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'send-to-class-teacher.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'send-to-class-teacher' && event.payload.action_id !== 'send-to-class-teacher') {
      return;
    }

    // TODO: Implement domain logic for send-to-class-teacher
    console.log('[SendToClassTeacherConsumer] Executing action:', event.payload);
  }
}
