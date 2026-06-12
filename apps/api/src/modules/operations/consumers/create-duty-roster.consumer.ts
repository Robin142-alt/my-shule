import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class CreateDutyRosterConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'create-duty-roster.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'create-duty-roster' && event.payload.action_id !== 'create-duty-roster') {
      return;
    }

    // TODO: Implement domain logic for create-duty-roster
    console.log('[CreateDutyRosterConsumer] Executing action:', event.payload);
  }
}
