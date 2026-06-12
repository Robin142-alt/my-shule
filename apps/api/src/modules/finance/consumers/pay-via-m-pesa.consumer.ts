import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PayViaMPesaConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'pay-via-m-pesa.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'pay-via-m-pesa' && event.payload.action_id !== 'pay-via-m-pesa') {
      return;
    }

    // TODO: Implement domain logic for pay-via-m-pesa
    console.log('[PayViaMPesaConsumer] Executing action:', event.payload);
  }
}
