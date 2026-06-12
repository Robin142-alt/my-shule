import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class OpenConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'open.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'open' && event.payload.action_id !== 'open') {
      return;
    }

    // TODO: Implement domain logic for open
    console.log('[OpenConsumer] Executing action:', event.payload);
  }
}
