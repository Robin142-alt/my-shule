import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ReturnConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'return.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'return' && event.payload.action_id !== 'return') {
      return;
    }

    // TODO: Implement domain logic for return
    console.log('[ReturnConsumer] Executing action:', event.payload);
  }
}
