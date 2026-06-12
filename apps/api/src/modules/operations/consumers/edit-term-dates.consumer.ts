import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class EditTermDatesConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'edit-term-dates.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'edit-term-dates' && event.payload.action_id !== 'edit-term-dates') {
      return;
    }

    // TODO: Implement domain logic for edit-term-dates
    console.log('[EditTermDatesConsumer] Executing action:', event.payload);
  }
}
