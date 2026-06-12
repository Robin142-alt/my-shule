import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportTransfersConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-transfers.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-transfers' && event.payload.action_id !== 'export-transfers') {
      return;
    }

    // TODO: Implement domain logic for export-transfers
    console.log('[ExportTransfersConsumer] Executing action:', event.payload);
  }
}
