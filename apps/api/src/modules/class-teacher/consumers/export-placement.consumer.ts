import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportPlacementConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-placement.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-placement' && event.payload.action_id !== 'export-placement') {
      return;
    }

    // TODO: Implement domain logic for export-placement
    console.log('[ExportPlacementConsumer] Executing action:', event.payload);
  }
}
