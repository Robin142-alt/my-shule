import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportAcademicSummaryConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-academic-summary.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-academic-summary' && event.payload.action_id !== 'export-academic-summary') {
      return;
    }

    // TODO: Implement domain logic for export-academic-summary
    console.log('[ExportAcademicSummaryConsumer] Executing action:', event.payload);
  }
}
