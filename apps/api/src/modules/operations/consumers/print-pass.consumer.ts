import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintPassConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-pass.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-pass' && event.payload.action_id !== 'print-pass') {
      return;
    }

    // TODO: Implement domain logic for print-pass
    console.log('[PrintPassConsumer] Executing action:', event.payload);
  }
}
