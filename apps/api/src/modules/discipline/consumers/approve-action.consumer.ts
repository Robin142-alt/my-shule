import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ApproveActionConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'approve-action.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'approve-action' && event.payload.action_id !== 'approve-action') {
      return;
    }

    // TODO: Implement domain logic for approve-action
    console.log('[ApproveActionConsumer] Executing action:', event.payload);
  }
}
