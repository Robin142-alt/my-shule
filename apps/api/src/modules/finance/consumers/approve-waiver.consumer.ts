import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ApproveWaiverConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'approve-waiver.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'approve-waiver' && event.payload.action_id !== 'approve-waiver') {
      return;
    }

    // TODO: Implement domain logic for approve-waiver
    console.log('[ApproveWaiverConsumer] Executing action:', event.payload);
  }
}
