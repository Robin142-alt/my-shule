import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class EscalateRepeatAbsenceConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'escalate-repeat-absence.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'escalate-repeat-absence' && event.payload.action_id !== 'escalate-repeat-absence') {
      return;
    }

    // TODO: Implement domain logic for escalate-repeat-absence
    console.log('[EscalateRepeatAbsenceConsumer] Executing action:', event.payload);
  }
}
