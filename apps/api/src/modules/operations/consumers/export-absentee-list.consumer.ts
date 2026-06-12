import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportAbsenteeListConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-absentee-list.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-absentee-list' && event.payload.action_id !== 'export-absentee-list') {
      return;
    }

    // TODO: Implement domain logic for export-absentee-list
    console.log('[ExportAbsenteeListConsumer] Executing action:', event.payload);
  }
}
