import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AcceptConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'accept.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'accept' && event.payload.action_id !== 'accept') {
      return;
    }

    // TODO: Implement domain logic for accept
    console.log('[AcceptConsumer] Executing action:', event.payload);
  }
}
