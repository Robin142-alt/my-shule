import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintGatePassConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-gate-pass.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-gate-pass' && event.payload.action_id !== 'print-gate-pass') {
      return;
    }

    // TODO: Implement domain logic for print-gate-pass
    console.log('[PrintGatePassConsumer] Executing action:', event.payload);
  }
}
