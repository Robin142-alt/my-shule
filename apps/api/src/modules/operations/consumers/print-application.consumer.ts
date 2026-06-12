import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintApplicationConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print-application.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print-application' && event.payload.action_id !== 'print-application') {
      return;
    }

    // TODO: Implement domain logic for print-application
    console.log('[PrintApplicationConsumer] Executing action:', event.payload);
  }
}
