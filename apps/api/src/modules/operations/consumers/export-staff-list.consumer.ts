import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportStaffListConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-staff-list.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-staff-list' && event.payload.action_id !== 'export-staff-list') {
      return;
    }

    // TODO: Implement domain logic for export-staff-list
    console.log('[ExportStaffListConsumer] Executing action:', event.payload);
  }
}
