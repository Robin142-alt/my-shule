import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintIncidentFormConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-incident-form.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-incident-form' && event.payload.action_id !== 'print-incident-form') {
      return;
    }

    // TODO: Implement domain logic for print-incident-form
    console.log('[PrintIncidentFormConsumer] Executing action:', event.payload);
  }
}
