import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintCaseRegisterConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-case-register.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-case-register' && event.payload.action_id !== 'print-case-register') {
      return;
    }

    // TODO: Implement domain logic for print-case-register
    console.log('[PrintCaseRegisterConsumer] Executing action:', event.payload);
  }
}
