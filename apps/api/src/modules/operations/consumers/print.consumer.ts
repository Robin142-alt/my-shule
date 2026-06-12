import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class PrintConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'print.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'print' && event.payload.action_id !== 'print') {
      return;
    }

    // TODO: Implement domain logic for print
    console.log('[PrintConsumer] Executing action:', event.payload);
  }
}
