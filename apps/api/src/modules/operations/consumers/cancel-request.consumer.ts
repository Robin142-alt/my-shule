import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class CancelRequestConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'cancel-request.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'cancel-request' && event.payload.action_id !== 'cancel-request') {
      return;
    }

    // TODO: Implement domain logic for cancel-request
    console.log('[CancelRequestConsumer] Executing action:', event.payload);
  }
}
