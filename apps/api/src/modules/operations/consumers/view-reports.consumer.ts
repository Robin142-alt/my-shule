import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ViewReportsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'view-reports.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'view-reports' && event.payload.action_id !== 'view-reports') {
      return;
    }

    // TODO: Implement domain logic for view-reports
    console.log('[ViewReportsConsumer] Executing action:', event.payload);
  }
}
