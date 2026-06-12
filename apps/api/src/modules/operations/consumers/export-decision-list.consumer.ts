import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportDecisionListConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-decision-list.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-decision-list' && event.payload.action_id !== 'export-decision-list') {
      return;
    }

    // TODO: Implement domain logic for export-decision-list
    console.log('[ExportDecisionListConsumer] Executing action:', event.payload);
  }
}
