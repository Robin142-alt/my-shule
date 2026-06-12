import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class TermDatesAffectAttendanceConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'term-dates-affect-attendance.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'term-dates-affect-attendance' && event.payload.action_id !== 'term-dates-affect-attendance') {
      return;
    }

    // TODO: Implement domain logic for term-dates-affect-attendance
    console.log('[TermDatesAffectAttendanceConsumer] Executing action:', event.payload);
  }
}
