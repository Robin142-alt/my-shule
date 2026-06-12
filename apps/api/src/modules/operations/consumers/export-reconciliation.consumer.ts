import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportReconciliationConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-reconciliation.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-reconciliation' && event.payload.action_id !== 'export-reconciliation') {
      return;
    }

    // TODO: Implement domain logic for export-reconciliation
    console.log('[ExportReconciliationConsumer] Executing action:', event.payload);
  }
}
