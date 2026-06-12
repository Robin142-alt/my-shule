import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintFormConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-form.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-form' && event.payload.action_id !== 'print-form') {
      return;
    }

    // TODO: Implement domain logic for print-form
    console.log('[PrintFormConsumer] Executing action:', event.payload);
  }
}
