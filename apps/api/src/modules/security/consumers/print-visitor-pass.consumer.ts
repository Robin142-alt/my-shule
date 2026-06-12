import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintVisitorPassConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-visitor-pass.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-visitor-pass' && event.payload.action_id !== 'print-visitor-pass') {
      return;
    }

    // TODO: Implement domain logic for print-visitor-pass
    console.log('[PrintVisitorPassConsumer] Executing action:', event.payload);
  }
}
