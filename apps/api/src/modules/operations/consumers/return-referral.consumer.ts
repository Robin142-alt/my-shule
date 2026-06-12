import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ReturnReferralConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'return-referral.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'return-referral' && event.payload.action_id !== 'return-referral') {
      return;
    }

    // TODO: Implement domain logic for return-referral
    console.log('[ReturnReferralConsumer] Executing action:', event.payload);
  }
}
