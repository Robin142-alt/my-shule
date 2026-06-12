import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportModuleMatrixConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-module-matrix.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-module-matrix' && event.payload.action_id !== 'export-module-matrix') {
      return;
    }

    // TODO: Implement domain logic for export-module-matrix
    console.log('[ExportModuleMatrixConsumer] Executing action:', event.payload);
  }
}
