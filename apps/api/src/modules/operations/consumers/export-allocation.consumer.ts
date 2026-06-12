import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportAllocationConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-allocation.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-allocation' && event.payload.action_id !== 'export-allocation') {
      return;
    }

    // TODO: Implement domain logic for export-allocation
    console.log('[ExportAllocationConsumer] Executing action:', event.payload);
  }
}
