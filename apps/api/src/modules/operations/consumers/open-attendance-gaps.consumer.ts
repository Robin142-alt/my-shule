import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class OpenAttendanceGapsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'open-attendance-gaps.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'open-attendance-gaps' && event.payload.action_id !== 'open-attendance-gaps') {
      return;
    }

    // TODO: Implement domain logic for open-attendance-gaps
    console.log('[OpenAttendanceGapsConsumer] Executing action:', event.payload);
  }
}
