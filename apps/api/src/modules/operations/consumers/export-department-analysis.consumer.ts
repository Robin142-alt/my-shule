import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ExportDepartmentAnalysisConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'export-department-analysis.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'export-department-analysis' && event.payload.action_id !== 'export-department-analysis') {
      return;
    }

    // TODO: Implement domain logic for export-department-analysis
    console.log('[ExportDepartmentAnalysisConsumer] Executing action:', event.payload);
  }
}
