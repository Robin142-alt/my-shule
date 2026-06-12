import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportOverviewConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-overview.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-overview' && event.payload.action_id !== 'export-overview') {
      return;
    }

    // TODO: Implement domain logic for export-overview
    console.log('[ExportOverviewConsumer] Executing action:', event.payload);
  }
}
