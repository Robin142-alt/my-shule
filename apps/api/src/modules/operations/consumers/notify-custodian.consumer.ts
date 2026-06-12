import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class NotifyCustodianConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'notify-custodian.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'notify-custodian' && event.payload.action_id !== 'notify-custodian') {
      return;
    }

    // TODO: Implement domain logic for notify-custodian
    console.log('[NotifyCustodianConsumer] Executing action:', event.payload);
  }
}
