import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportRoutesConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-routes.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-routes' && event.payload.action_id !== 'export-routes') {
      return;
    }

    // TODO: Implement domain logic for export-routes
    console.log('[ExportRoutesConsumer] Executing action:', event.payload);
  }
}
