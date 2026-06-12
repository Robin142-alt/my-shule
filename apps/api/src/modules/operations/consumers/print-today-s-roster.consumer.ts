import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintTodaySRosterConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-today-s-roster.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-today-s-roster' && event.payload.action_id !== 'print-today-s-roster') {
      return;
    }

    // TODO: Implement domain logic for print-today-s-roster
    console.log('[PrintTodaySRosterConsumer] Executing action:', event.payload);
  }
}
