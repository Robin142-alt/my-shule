import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class SubmitRequestConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'submit-request.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'submit-request' && event.payload.action_id !== 'submit-request') {
      return;
    }

    // TODO: Implement domain logic for submit-request
    console.log('[SubmitRequestConsumer] Executing action:', event.payload);
  }
}
