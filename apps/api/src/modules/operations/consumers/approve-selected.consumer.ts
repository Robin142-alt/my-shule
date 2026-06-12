import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ApproveSelectedConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'approve-selected.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'approve-selected' && event.payload.action_id !== 'approve-selected') {
      return;
    }

    // TODO: Implement domain logic for approve-selected
    console.log('[ApproveSelectedConsumer] Executing action:', event.payload);
  }
}
