import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';

@Injectable()
export class CloseConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  readonly name = 'close.execution';
  readonly event_name = 'workflow.action.completed' as const;

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    // Only process events that match our action workflow binding
    if (event.payload.workflow_id !== 'close' && event.payload.action_id !== 'close') {
      return;
    }

    // TODO: Implement domain logic for close
    console.log('[CloseConsumer] Executing action:', event.payload);
  }
}
