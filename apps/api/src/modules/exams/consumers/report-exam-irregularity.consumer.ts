import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ReportExamIrregularityConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'report-exam-irregularity.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'report-exam-irregularity' && event.payload.action_id !== 'report-exam-irregularity') {
      return;
    }

    // TODO: Implement domain logic for report-exam-irregularity
    console.log('[ReportExamIrregularityConsumer] Executing action:', event.payload);
  }
}
