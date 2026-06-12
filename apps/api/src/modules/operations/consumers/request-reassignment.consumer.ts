import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class RequestReassignmentConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'request-reassignment.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'request-reassignment' && event.payload.action_id !== 'request-reassignment') {
      return;
    }

    // TODO: Implement domain logic for request-reassignment
    console.log('[RequestReassignmentConsumer] Executing action:', event.payload);
  }
}
