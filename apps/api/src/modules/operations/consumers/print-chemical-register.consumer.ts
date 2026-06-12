import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintChemicalRegisterConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-chemical-register.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-chemical-register' && event.payload.action_id !== 'print-chemical-register') {
      return;
    }

    // TODO: Implement domain logic for print-chemical-register
    console.log('[PrintChemicalRegisterConsumer] Executing action:', event.payload);
  }
}
