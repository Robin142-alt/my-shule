import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintAdmissionRegisterConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-admission-register.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-admission-register' && event.payload.action_id !== 'print-admission-register') {
      return;
    }

    // TODO: Implement domain logic for print-admission-register
    console.log('[PrintAdmissionRegisterConsumer] Executing action:', event.payload);
  }
}
