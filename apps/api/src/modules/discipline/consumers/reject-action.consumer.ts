import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class RejectActionConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'reject-action.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'reject-action' && event.payload.action_id !== 'reject-action') {
      return;
    }

    // TODO: Implement domain logic for reject-action
    console.log('[RejectActionConsumer] Executing action:', event.payload);
  }
}
