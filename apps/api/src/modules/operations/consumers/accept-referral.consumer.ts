import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class AcceptReferralConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'accept-referral.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'accept-referral' && event.payload.action_id !== 'accept-referral') {
      return;
    }

    // TODO: Implement domain logic for accept-referral
    console.log('[AcceptReferralConsumer] Executing action:', event.payload);
  }
}
