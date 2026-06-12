import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportStocktakeConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-stocktake.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-stocktake' && event.payload.action_id !== 'export-stocktake') {
      return;
    }

    // TODO: Implement domain logic for export-stocktake
    console.log('[ExportStocktakeConsumer] Executing action:', event.payload);
  }
}
