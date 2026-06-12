import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportIssuesConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-issues.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-issues' && event.payload.action_id !== 'export-issues') {
      return;
    }

    // TODO: Implement domain logic for export-issues
    console.log('[ExportIssuesConsumer] Executing action:', event.payload);
  }
}
