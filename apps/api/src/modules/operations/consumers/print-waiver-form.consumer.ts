import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintWaiverFormConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-waiver-form.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-waiver-form' && event.payload.action_id !== 'print-waiver-form') {
      return;
    }

    // TODO: Implement domain logic for print-waiver-form
    console.log('[PrintWaiverFormConsumer] Executing action:', event.payload);
  }
}
