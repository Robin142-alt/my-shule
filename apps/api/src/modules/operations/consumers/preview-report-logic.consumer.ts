import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PreviewReportLogicConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'preview-report-logic.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'preview-report-logic' && event.payload.action_id !== 'preview-report-logic') {
      return;
    }

    // TODO: Implement domain logic for preview-report-logic
    console.log('[PreviewReportLogicConsumer] Executing action:', event.payload);
  }
}
