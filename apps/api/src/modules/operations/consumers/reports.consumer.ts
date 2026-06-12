import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ReportsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'reports.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'reports' && event.payload.action_id !== 'reports') {
      return;
    }

    // TODO: Implement domain logic for reports
    console.log('[ReportsConsumer] Executing action:', event.payload);
  }
}
