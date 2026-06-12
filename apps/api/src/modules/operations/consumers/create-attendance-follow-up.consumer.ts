import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class CreateAttendanceFollowUpConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'create-attendance-follow-up.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'create-attendance-follow-up' && event.payload.action_id !== 'create-attendance-follow-up') {
      return;
    }

    // TODO: Implement domain logic for create-attendance-follow-up
    console.log('[CreateAttendanceFollowUpConsumer] Executing action:', event.payload);
  }
}
