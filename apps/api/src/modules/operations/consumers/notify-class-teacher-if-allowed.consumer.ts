import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class NotifyClassTeacherIfAllowedConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'notify-class-teacher-if-allowed.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'notify-class-teacher-if-allowed' && event.payload.action_id !== 'notify-class-teacher-if-allowed') {
      return;
    }

    // TODO: Implement domain logic for notify-class-teacher-if-allowed
    console.log('[NotifyClassTeacherIfAllowedConsumer] Executing action:', event.payload);
  }
}
