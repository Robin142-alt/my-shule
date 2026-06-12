import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ViewReportCardConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'view-report-card.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'view-report-card' && event.payload.action_id !== 'view-report-card') {
      return;
    }

    // TODO: Implement domain logic for view-report-card
    console.log('[ViewReportCardConsumer] Executing action:', event.payload);
  }
}
