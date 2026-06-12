import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ReconcileMPesaConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'reconcile-m-pesa.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'reconcile-m-pesa' && event.payload.action_id !== 'reconcile-m-pesa') {
      return;
    }

    // TODO: Implement domain logic for reconcile-m-pesa
    console.log('[ReconcileMPesaConsumer] Executing action:', event.payload);
  }
}
