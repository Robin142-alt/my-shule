import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportCalendarConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-calendar.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-calendar' && event.payload.action_id !== 'export-calendar') {
      return;
    }

    // TODO: Implement domain logic for export-calendar
    console.log('[ExportCalendarConsumer] Executing action:', event.payload);
  }
}
