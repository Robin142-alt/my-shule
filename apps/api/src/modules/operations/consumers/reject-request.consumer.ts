import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class RejectRequestConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'reject-request.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'reject-request' && event.payload.action_id !== 'reject-request') {
      return;
    }

    // TODO: Implement domain logic for reject-request
    console.log('[RejectRequestConsumer] Executing action:', event.payload);
  }
}
