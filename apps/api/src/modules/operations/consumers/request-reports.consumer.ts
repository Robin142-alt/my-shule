import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class RequestReportsConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'request-reports.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'request-reports' && event.payload.action_id !== 'request-reports') {
      return;
    }

    // TODO: Implement domain logic for request-reports
    console.log('[RequestReportsConsumer] Executing action:', event.payload);
  }
}
