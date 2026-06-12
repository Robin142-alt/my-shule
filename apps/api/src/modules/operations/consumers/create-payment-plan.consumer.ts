import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class CreatePaymentPlanConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'create-payment-plan.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'create-payment-plan' && event.payload.action_id !== 'create-payment-plan') {
      return;
    }

    // TODO: Implement domain logic for create-payment-plan
    console.log('[CreatePaymentPlanConsumer] Executing action:', event.payload);
  }
}
