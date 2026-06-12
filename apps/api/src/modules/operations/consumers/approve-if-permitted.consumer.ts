import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ApproveIfPermittedConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'approve-if-permitted.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'approve-if-permitted' && event.payload.action_id !== 'approve-if-permitted') {
      return;
    }

    // TODO: Implement domain logic for approve-if-permitted
    console.log('[ApproveIfPermittedConsumer] Executing action:', event.payload);
  }
}
