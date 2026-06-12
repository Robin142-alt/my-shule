import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class NotifyClassTeacherConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'notify-class-teacher.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'notify-class-teacher' && event.payload.action_id !== 'notify-class-teacher') {
      return;
    }

    // TODO: Implement domain logic for notify-class-teacher
    console.log('[NotifyClassTeacherConsumer] Executing action:', event.payload);
  }
}
