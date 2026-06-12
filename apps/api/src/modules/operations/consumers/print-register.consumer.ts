import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintRegisterConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-register.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-register' && event.payload.action_id !== 'print-register') {
      return;
    }

    // TODO: Implement domain logic for print-register
    console.log('[PrintRegisterConsumer] Executing action:', event.payload);
  }
}
