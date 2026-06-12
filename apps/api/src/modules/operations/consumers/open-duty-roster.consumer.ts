import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class OpenDutyRosterConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'open-duty-roster.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'open-duty-roster' && event.payload.action_id !== 'open-duty-roster') {
      return;
    }

    // TODO: Implement domain logic for open-duty-roster
    console.log('[OpenDutyRosterConsumer] Executing action:', event.payload);
  }
}
