import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class RejectWaiverConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'reject-waiver.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'reject-waiver' && event.payload.action_id !== 'reject-waiver') {
      return;
    }

    // TODO: Implement domain logic for reject-waiver
    console.log('[RejectWaiverConsumer] Executing action:', event.payload);
  }
}
