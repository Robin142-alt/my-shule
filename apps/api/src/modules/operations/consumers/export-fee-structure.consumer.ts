import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportFeeStructureConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-fee-structure.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-fee-structure' && event.payload.action_id !== 'export-fee-structure') {
      return;
    }

    // TODO: Implement domain logic for export-fee-structure
    console.log('[ExportFeeStructureConsumer] Executing action:', event.payload);
  }
}
