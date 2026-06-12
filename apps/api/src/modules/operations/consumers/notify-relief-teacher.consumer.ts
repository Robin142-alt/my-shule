import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class NotifyReliefTeacherConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'notify-relief-teacher.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'notify-relief-teacher' && event.payload.action_id !== 'notify-relief-teacher') {
      return;
    }

    // TODO: Implement domain logic for notify-relief-teacher
    console.log('[NotifyReliefTeacherConsumer] Executing action:', event.payload);
  }
}
