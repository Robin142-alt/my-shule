import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ReportIrregularityConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'report-irregularity.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'report-irregularity' && event.payload.action_id !== 'report-irregularity') {
      return;
    }

    // TODO: Implement domain logic for report-irregularity
    console.log('[ReportIrregularityConsumer] Executing action:', event.payload);
  }
}
