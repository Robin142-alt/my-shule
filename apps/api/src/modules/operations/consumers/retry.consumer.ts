import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class RetryConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'retry.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'retry' && event.payload.action_id !== 'retry') {
      return;
    }

    // TODO: Implement domain logic for retry
    console.log('[RetryConsumer] Executing action:', event.payload);
  }
}
