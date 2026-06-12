import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class ReturnAllConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'return-all.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'return-all' && event.payload.action_id !== 'return-all') {
      return;
    }

    // TODO: Implement domain logic for return-all
    console.log('[ReturnAllConsumer] Executing action:', event.payload);
  }
}
