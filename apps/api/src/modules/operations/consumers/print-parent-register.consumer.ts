import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintParentRegisterConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-parent-register.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-parent-register' && event.payload.action_id !== 'print-parent-register') {
      return;
    }

    // TODO: Implement domain logic for print-parent-register
    console.log('[PrintParentRegisterConsumer] Executing action:', event.payload);
  }
}
