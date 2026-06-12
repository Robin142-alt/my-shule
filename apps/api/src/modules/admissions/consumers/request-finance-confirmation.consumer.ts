import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class RequestFinanceConfirmationConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'request-finance-confirmation.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'request-finance-confirmation' && event.payload.action_id !== 'request-finance-confirmation') {
      return;
    }

    // TODO: Implement domain logic for request-finance-confirmation
    console.log('[RequestFinanceConfirmationConsumer] Executing action:', event.payload);
  }
}
