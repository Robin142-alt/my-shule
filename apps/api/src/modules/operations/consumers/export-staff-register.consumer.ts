import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportStaffRegisterConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-staff-register.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-staff-register' && event.payload.action_id !== 'export-staff-register') {
      return;
    }

    // TODO: Implement domain logic for export-staff-register
    console.log('[ExportStaffRegisterConsumer] Executing action:', event.payload);
  }
}
