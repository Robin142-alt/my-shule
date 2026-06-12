import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintTodaySVisitsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-today-s-visits.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-today-s-visits' && event.payload.action_id !== 'print-today-s-visits') {
      return;
    }

    // TODO: Implement domain logic for print-today-s-visits
    console.log('[PrintTodaySVisitsConsumer] Executing action:', event.payload);
  }
}
