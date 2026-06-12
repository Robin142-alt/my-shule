import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportExcelConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-excel.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-excel' && event.payload.action_id !== 'export-excel') {
      return;
    }

    // TODO: Implement domain logic for export-excel
    console.log('[ExportExcelConsumer] Executing action:', event.payload);
  }
}
