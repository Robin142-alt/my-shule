import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ApproveConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'approve.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'approve' && event.payload.action_id !== 'approve') {
      return;
    }

    // TODO: Implement domain logic for approve
    console.log('[ApproveConsumer] Executing action:', event.payload);
  }
}
